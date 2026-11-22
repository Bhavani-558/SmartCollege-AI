"""Admin authentication utilities: salted PBKDF2 hashing, signed expiring JWT tokens,
persistent token revocation that survives server restarts, and FastAPI dependencies.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import jwt
from fastapi import Depends, Request, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.services.data_store import ChatbotDomainError
from backend.app.utils.config import Settings, get_settings
from backend.app.utils.schemas import AdminUserResponse

MIN_JWT_SECRET_LENGTH = 32


class AdminAuthError(ChatbotDomainError):
    """Raised when authentication fails, token is expired, or credentials are invalid."""

    def __init__(self, detail: str = "Invalid or missing admin authentication token.") -> None:
        super().__init__(
            detail=detail,
            error_code="UNAUTHORIZED",
            status_code=401,
        )


class AdminConfigurationError(ChatbotDomainError):
    """Raised when admin authentication is misconfigured, missing required environment variables, or has weak secrets."""

    def __init__(self, detail: str = "Admin authentication is not configured on this server.") -> None:
        super().__init__(
            detail=detail,
            error_code="ADMIN_CONFIG_ERROR",
            status_code=503,
        )


def validate_jwt_secret(secret: str | None) -> str:
    """Validate that JWT secret is present and meets the minimum 32 character (256-bit) requirement for HS256."""
    if not secret or not secret.strip():
        raise AdminConfigurationError(
            "ADMIN_JWT_SECRET environment variable is missing. A secure secret of at least 32 characters is required."
        )
    clean_secret = secret.strip()
    if len(clean_secret) < MIN_JWT_SECRET_LENGTH:
        raise AdminConfigurationError(
            f"ADMIN_JWT_SECRET is too weak ({len(clean_secret)} characters). A minimum of 32 characters (256 bits) is required."
        )
    return clean_secret


def hash_password(password: str, iterations: int = 100_000) -> str:
    """Generate a secure salted PBKDF2-HMAC-SHA256 password hash."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain password against a salted PBKDF2-HMAC-SHA256 hash in constant time."""
    try:
        parts = password_hash.split("$")
        if len(parts) == 4 and parts[0] == "pbkdf2_sha256":
            iterations = int(parts[1])
            salt = bytes.fromhex(parts[2])
            expected_key = bytes.fromhex(parts[3])
            computed_key = hashlib.pbkdf2_hmac(
                "sha256", plain_password.encode("utf-8"), salt, iterations
            )
            return hmac.compare_digest(computed_key, expected_key)
        return hmac.compare_digest(plain_password.strip(), password_hash.strip())
    except Exception:
        return False


def create_access_token(
    subject: str,
    secret_key: str,
    algorithm: str = "HS256",
    expires_delta_minutes: int = 1440,
) -> tuple[str, int]:
    """Create a signed, expiring JWT access token. Validates secret length and returns (token, expires_in_seconds)."""
    valid_secret = validate_jwt_secret(secret_key)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_delta_minutes)
    jti = secrets.token_hex(16)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": "admin",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, valid_secret, algorithm=algorithm)
    expires_in = int((expires_at - now).total_seconds())
    return token, expires_in


class PersistentTokenRevocationStore:
    """Thread-safe, file-backed revocation store storing SHA-256 token digests and JTIs.
    
    Survives backend process restarts and automatically prunes expired revocation records.
    """

    def __init__(self, storage_path: Path | str | None = None) -> None:
        self.storage_path = Path(storage_path) if storage_path else None
        self._revoked_identifiers: set[str] = set()
        self._lock = threading.Lock()
        self._load()

    def _load(self) -> None:
        if not self.storage_path or not self.storage_path.exists():
            return
        try:
            with self.storage_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            now_ts = int(datetime.now(timezone.utc).timestamp())
            valid_revocations: dict[str, Any] = {}
            for identifier, meta in data.get("revoked_tokens", {}).items():
                exp = meta.get("exp")
                if exp is None or exp >= now_ts:
                    valid_revocations[identifier] = meta
                    self._revoked_identifiers.add(identifier)
            if len(valid_revocations) != len(data.get("revoked_tokens", {})):
                self._save_raw(valid_revocations)
        except Exception:
            pass

    def _save_raw(self, payload: dict[str, Any]) -> None:
        if not self.storage_path:
            return
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.storage_path.with_suffix(".tmp")
        with temp_path.open("w", encoding="utf-8") as f:
            json.dump({"revoked_tokens": payload}, f, indent=2)
        temp_path.replace(self.storage_path)

    def revoke(
        self,
        token: str,
        secret_key: str | None = None,
        algorithm: str = "HS256",
    ) -> bool:
        """Revoke a token by its cryptographic SHA-256 hash and JTI."""
        with self._lock:
            now = datetime.now(timezone.utc)
            token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
            self._revoked_identifiers.add(token_hash)

            meta: dict[str, Any] = {
                "revoked_at": now.isoformat(),
                "exp": None,
            }

            if secret_key:
                try:
                    payload = jwt.decode(
                        token,
                        secret_key,
                        algorithms=[algorithm],
                        options={"verify_exp": False},
                    )
                    jti = payload.get("jti")
                    if jti:
                        self._revoked_identifiers.add(str(jti))
                        meta["jti"] = str(jti)
                    exp = payload.get("exp")
                    if exp:
                        meta["exp"] = int(exp)
                except Exception:
                    pass

            if self.storage_path:
                existing_records: dict[str, Any] = {}
                if self.storage_path.exists():
                    try:
                        with self.storage_path.open("r", encoding="utf-8") as f:
                            existing_records = json.load(f).get("revoked_tokens", {})
                    except Exception:
                        existing_records = {}
                existing_records[token_hash] = meta
                if meta.get("jti"):
                    existing_records[meta["jti"]] = meta
                self._save_raw(existing_records)

            return True

    def is_revoked(self, token: str, jti: str | None = None) -> bool:
        """Check whether token hash or jti is in the revocation store."""
        token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
        return token_hash in self._revoked_identifiers or (
            jti is not None and jti in self._revoked_identifiers
        )

    def clear(self) -> None:
        """Clear memory and disk records (primarily for testing)."""
        with self._lock:
            self._revoked_identifiers.clear()
            if self.storage_path and self.storage_path.exists():
                try:
                    self.storage_path.unlink()
                except Exception:
                    pass


# Singleton revocation registry instance
_revocation_store_instance: PersistentTokenRevocationStore | None = None


def get_revocation_store(
    storage_path: Path | str | None = None,
) -> PersistentTokenRevocationStore:
    """Return the active persistent token revocation store."""
    global _revocation_store_instance
    if _revocation_store_instance is None or storage_path is not None:
        settings = get_settings()
        path = Path(storage_path) if storage_path else settings.revoked_tokens_path
        _revocation_store_instance = PersistentTokenRevocationStore(path)
    return _revocation_store_instance


def revoke_token(
    token: str,
    secret_key: str | None = None,
    algorithm: str = "HS256",
    storage_path: Path | str | None = None,
) -> bool:
    """Revoke an active token so it cannot be reused even across server restarts."""
    store = get_revocation_store(storage_path)
    return store.revoke(token, secret_key, algorithm)


def is_token_revoked(
    token: str,
    jti: str | None = None,
    storage_path: Path | str | None = None,
) -> bool:
    """Check if token or its jti identifier has been revoked."""
    store = get_revocation_store(storage_path)
    return store.is_revoked(token, jti)


def clear_revoked_tokens() -> None:
    """Clear revocation store memory and disk cache (used for clean test suites)."""
    store = get_revocation_store()
    store.clear()


def authenticate_admin(
    username: str | None,
    plain_password: str | None,
    settings: Settings,
) -> bool:
    """Validate administrator credentials using constant-time comparisons.
    
    Rejects authentication immediately if admin credentials are not configured in settings.
    Never accepts hardcoded fallback passwords.
    """
    if not username or not plain_password:
        return False

    # Enforce that server admin credentials are affirmatively configured
    if not settings.admin_username or not settings.admin_username.strip():
        return False

    if not settings.admin_password and not settings.admin_password_hash:
        return False

    # Constant-time comparison for username
    if not hmac.compare_digest(username.strip(), settings.admin_username.strip()):
        return False

    # Check against pre-computed salted hash if set
    if settings.admin_password_hash:
        return verify_password(plain_password, settings.admin_password_hash)

    # Check against configured password
    if settings.admin_password:
        if settings.admin_password.startswith("pbkdf2_sha256$"):
            return verify_password(plain_password, settings.admin_password)
        return hmac.compare_digest(plain_password.strip(), settings.admin_password.strip())

    return False


_http_bearer = HTTPBearer(auto_error=False)


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_http_bearer),
    settings: Settings = Depends(get_settings),
) -> AdminUserResponse:
    """FastAPI reusable dependency: validates token from cookie or Authorization header.
    Returns active AdminUserResponse.
    """
    # Retrieve token from cookie if Authorization header missing
    if credentials is None:
        token = request.cookies.get("access_token")
        if not token:
            raise AdminAuthError("Authentication required. No token provided.")
    else:
        token = credentials.credentials
    # Validate that signing secret is properly configured and strong
    valid_secret = validate_jwt_secret(settings.admin_jwt_secret)
    try:
        payload = jwt.decode(
            token,
            valid_secret,
            algorithms=[settings.admin_jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise AdminAuthError("Authentication token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise AdminAuthError("Invalid authentication token.")
    jti = payload.get("jti")
    if is_token_revoked(token, jti):
        raise AdminAuthError("Authentication token has been revoked. Please log in again.")
    username = payload.get("sub")
    if (
        not username
        or not settings.admin_username
        or username != settings.admin_username
    ):
        raise AdminAuthError("Authentication token subject is invalid.")
    return AdminUserResponse(
        username=str(username),
        role=str(payload.get("role", "admin")),
        authenticated=True,
    )

# Deprecated original token validation removed – cookie handling implemented above


    # Retrieve token from cookie if Authorization header missing
    if credentials is None:
        token = request.cookies.get("access_token")
        if not token:
            raise AdminAuthError("Authentication required. No token provided.")
    else:
        token = credentials.credentials
    # Validate that signing secret is properly configured and strong
    valid_secret = validate_jwt_secret(settings.admin_jwt_secret)

    try:
        payload = jwt.decode(
            token,
            valid_secret,
            algorithms=[settings.admin_jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise AdminAuthError("Authentication token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise AdminAuthError("Invalid authentication token.")

    jti = payload.get("jti")
    if is_token_revoked(token, jti):
        raise AdminAuthError("Authentication token has been revoked. Please log in again.")

    username = payload.get("sub")
    if (
        not username
        or not settings.admin_username
        or username != settings.admin_username
    ):
        raise AdminAuthError("Authentication token subject is invalid.")

    return AdminUserResponse(
        username=str(username),
        role=str(payload.get("role", "admin")),
        authenticated=True,
    )
    """FastAPI reusable dependency: validates Bearer token and returns active AdminUserResponse."""
# Deprecated original token validation removed – cookie handling implemented above

def csrf_protect(request: Request) -> None:
    """Validate CSRF token using double‑submit cookie pattern.
    Expects a non‑HttpOnly cookie ``XSRF-TOKEN`` and matching ``X-XSRF-TOKEN`` header.
    """
    csrf_cookie = request.cookies.get("XSRF-TOKEN")
    csrf_header = request.headers.get("X-XSRF-TOKEN")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF token missing or invalid.")
    # Dependency passes if valid.

