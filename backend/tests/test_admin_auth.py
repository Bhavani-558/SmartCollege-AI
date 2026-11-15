"""Unit and integration tests for backend admin authentication security review."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import pytest

from backend.app.main import create_app
from backend.app.utils.admin_auth import (
    AdminAuthError,
    AdminConfigurationError,
    PersistentTokenRevocationStore,
    authenticate_admin,
    clear_revoked_tokens,
    create_access_token,
    get_revocation_store,
    hash_password,
    is_token_revoked,
    revoke_token,
    validate_jwt_secret,
    verify_password,
)
from backend.app.utils.config import Settings
from backend.tests.conftest import ASGITestClient


@pytest.fixture(autouse=True)
def _reset_revocations():
    """Ensure clean revocation state for every test."""
    clear_revoked_tokens()
    yield
    clear_revoked_tokens()


def test_password_hashing_and_verification() -> None:
    """PBKDF2 salted password hashing generates distinct hashes and correctly verifies passwords."""
    raw_password = "SuperSecretPassword123!"
    hash1 = hash_password(raw_password, iterations=10_000)
    hash2 = hash_password(raw_password, iterations=10_000)

    # Salted hashes must be distinct even for the identical password
    assert hash1 != hash2
    assert hash1.startswith("pbkdf2_sha256$10000$")
    assert hash2.startswith("pbkdf2_sha256$10000$")

    # Correct password verifies successfully
    assert verify_password(raw_password, hash1) is True
    assert verify_password(raw_password, hash2) is True

    # Incorrect passwords fail verification
    assert verify_password("WrongPassword!", hash1) is False
    assert verify_password("", hash1) is False
    assert verify_password("supersecretpassword123!", hash1) is False


def test_jwt_token_creation_and_payload() -> None:
    """JWT tokens include subject, role, expiration, and unique jti."""
    secret = "test-secret-key-12345-long-enough-for-sha256-security-compliance"
    token, expires_in = create_access_token(
        subject="admin_user",
        secret_key=secret,
        algorithm="HS256",
        expires_delta_minutes=60,
    )
    assert isinstance(token, str)
    assert 3500 <= expires_in <= 3600

    payload = jwt.decode(token, secret, algorithms=["HS256"])
    assert payload["sub"] == "admin_user"
    assert payload["role"] == "admin"
    assert "jti" in payload
    assert payload["exp"] > payload["iat"]


def test_jwt_token_expiry_validation() -> None:
    """Expired JWT tokens are rejected by decode verification."""
    secret = "test-secret-key-12345-long-enough-for-sha256-security-compliance"
    now = datetime.now(timezone.utc)
    expired_payload = {
        "sub": "admin",
        "role": "admin",
        "jti": "expired-token-id",
        "iat": int((now - timedelta(hours=2)).timestamp()),
        "exp": int((now - timedelta(hours=1)).timestamp()),
    }
    expired_token = jwt.encode(expired_payload, secret, algorithm="HS256")

    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(expired_token, secret, algorithms=["HS256"])


def test_jwt_token_wrong_secret() -> None:
    """Tokens signed with a different secret are rejected as invalid."""
    secret_one = "secret-one-long-enough-for-sha256-compliance-123456"
    secret_two = "secret-two-long-enough-for-sha256-compliance-123456"
    token, _ = create_access_token(
        subject="admin",
        secret_key=secret_one,
        expires_delta_minutes=30,
    )

    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, secret_two, algorithms=["HS256"])


def test_missing_and_weak_jwt_secrets_rejected() -> None:
    """Missing or weak JWT signing secrets (< 32 characters) must be rejected."""
    # Missing / None
    with pytest.raises(AdminConfigurationError) as exc_none:
        validate_jwt_secret(None)
    assert "missing" in str(exc_none.value.detail).lower()

    # Empty string
    with pytest.raises(AdminConfigurationError) as exc_empty:
        validate_jwt_secret("   ")
    assert "missing" in str(exc_empty.value.detail).lower()

    # Too short (< 32 characters)
    with pytest.raises(AdminConfigurationError) as exc_weak:
        validate_jwt_secret("too-short-secret-12345")
    assert "weak" in str(exc_weak.value.detail).lower()
    assert "32 characters" in str(exc_weak.value.detail)

    # Valid secret (>= 32 characters)
    valid_key = "a" * 32
    assert validate_jwt_secret(valid_key) == valid_key

    # Attempting to create access token with weak secret must fail
    with pytest.raises(AdminConfigurationError):
        create_access_token("admin", "short_key")


def test_unconfigured_admin_credentials_rejects_login() -> None:
    """When admin credentials are not set in environment/settings, login attempts are securely blocked."""
    unconfigured_settings = Settings(
        admin_username=None,
        admin_password=None,
        admin_password_hash=None,
        admin_jwt_secret="a" * 32,
    )
    assert authenticate_admin("admin", "somepassword", unconfigured_settings) is False

    app = create_app(custom_settings=unconfigured_settings)
    with ASGITestClient(app) as test_client:
        resp = test_client.post(
            "/api/admin/auth/login",
            json={"username": "admin", "password": "somepassword"},
        )
        assert resp.status_code == 503
        data = resp.json()
        assert data["error_code"] == "ADMIN_CONFIG_ERROR"
        assert "not configured" in data["detail"].lower()


def test_no_default_fallback_credentials_accepted(client: ASGITestClient) -> None:
    """The old hardcoded password 'SmartCollegeAdmin2026!' is never accepted by default."""
    bad_login = client.post(
        "/api/admin/auth/login",
        json={"username": "admin", "password": "SmartCollegeAdmin2026!"},
    )
    assert bad_login.status_code == 401
    assert bad_login.json()["error_code"] == "UNAUTHORIZED"


def test_persistent_token_revocation_survives_restart(tmp_path: Path) -> None:
    """Token revocation persists to disk and survives simulated server restarts."""
    revocation_file = tmp_path / "revocation_test.json"
    secret = "a" * 32

    # Step 1: Initialize first revocation store
    store1 = PersistentTokenRevocationStore(revocation_file)
    token, _ = create_access_token("admin", secret)
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    jti = payload["jti"]

    assert store1.is_revoked(token, jti) is False

    # Step 2: Revoke token
    store1.revoke(token, secret)
    assert store1.is_revoked(token, jti) is True
    assert revocation_file.exists()

    # Step 3: Simulate backend process termination and restart with fresh store instance
    store2 = PersistentTokenRevocationStore(revocation_file)

    # Token must STILL be revoked in the restarted store
    assert store2.is_revoked(token, jti) is True


def test_revocation_store_prunes_expired_tokens(tmp_path: Path) -> None:
    """Persistent revocation store automatically prunes expired records on load."""
    revocation_file = tmp_path / "prune_test.json"
    now_ts = int(datetime.now(timezone.utc).timestamp())

    # Pre-populate with one expired token and one active token
    initial_data = {
        "revoked_tokens": {
            "expired_hash_123": {
                "revoked_at": "2026-11-13T10:00:00Z",
                "exp": now_ts - 3600,  # 1 hour ago
            },
            "active_hash_456": {
                "revoked_at": "2026-11-13T12:00:00Z",
                "exp": now_ts + 3600,  # 1 hour in future
            },
        }
    }
    revocation_file.write_text(json.dumps(initial_data), encoding="utf-8")

    # Load store
    store = PersistentTokenRevocationStore(revocation_file)

    # Active token remains revoked
    assert "active_hash_456" in store._revoked_identifiers
    # Expired token was pruned
    assert "expired_hash_123" not in store._revoked_identifiers

    # Verify file on disk was updated to pruned state
    disk_data = json.loads(revocation_file.read_text(encoding="utf-8"))
    assert "active_hash_456" in disk_data["revoked_tokens"]
    assert "expired_hash_123" not in disk_data["revoked_tokens"]


def test_authenticate_admin_with_plain_and_hashed_passwords() -> None:
    """authenticate_admin supports both plain and pre-hashed passwords."""
    plain_settings = Settings(
        admin_username="superadmin",
        admin_password="MyPlainPassword2026!",
        admin_password_hash=None,
        admin_jwt_secret="a" * 32,
    )
    assert authenticate_admin("superadmin", "MyPlainPassword2026!", plain_settings) is True
    assert authenticate_admin("superadmin", "WrongPassword", plain_settings) is False
    assert authenticate_admin("wronguser", "MyPlainPassword2026!", plain_settings) is False

    hashed_val = hash_password("HashSecurePassword2026!", iterations=10_000)
    hashed_settings = Settings(
        admin_username="hashadmin",
        admin_password_hash=hashed_val,
        admin_jwt_secret="a" * 32,
    )
    assert authenticate_admin("hashadmin", "HashSecurePassword2026!", hashed_settings) is True
    assert authenticate_admin("hashadmin", "WrongPassword", hashed_settings) is False


def test_admin_login_success(client: ASGITestClient, test_settings: Settings) -> None:
    """Valid credentials return a signed bearer token and user metadata."""
    response = client.post(
        "/api/admin/auth/login",
        json={
            "username": test_settings.admin_username,
            "password": test_settings.admin_password,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == test_settings.admin_username
    assert data["expires_in"] > 0
    # Credentials must NOT be returned in payload
    assert "password" not in data
    assert "secret" not in data


def test_admin_login_invalid_credentials(client: ASGITestClient, test_settings: Settings) -> None:
    """Invalid username or password returns HTTP 401 with structured UNAUTHORIZED error."""
    bad_password = client.post(
        "/api/admin/auth/login",
        json={"username": test_settings.admin_username, "password": "DefinitelyWrongPassword!"},
    )
    assert bad_password.status_code == 401
    bad_pass_body = bad_password.json()
    assert bad_pass_body["error_code"] == "UNAUTHORIZED"
    assert "Invalid username or password" in bad_pass_body["detail"]

    bad_user = client.post(
        "/api/admin/auth/login",
        json={"username": "unknown_admin", "password": test_settings.admin_password},
    )
    assert bad_user.status_code == 401
    assert bad_user.json()["error_code"] == "UNAUTHORIZED"


def test_admin_me_protected_route(client: ASGITestClient, test_settings: Settings) -> None:
    """Protected /api/admin/auth/me requires valid Bearer token."""
    # 1. Missing Authorization header -> 401
    unauth = client.get("/api/admin/auth/me")
    assert unauth.status_code == 401
    assert unauth.json()["error_code"] == "UNAUTHORIZED"

    # 2. Invalid Bearer token -> 401
    invalid_token = client.get(
        "/api/admin/auth/me",
        headers={"Authorization": "Bearer invalid.garbage.token"},
    )
    assert invalid_token.status_code == 401
    assert invalid_token.json()["error_code"] == "UNAUTHORIZED"

    # 3. Valid login -> Bearer token -> 200
    login_resp = client.post(
        "/api/admin/auth/login",
        json={
            "username": test_settings.admin_username,
            "password": test_settings.admin_password,
        },
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/api/admin/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == test_settings.admin_username
    assert me_data["role"] == "admin"
    assert me_data["authenticated"] is True


def test_admin_logout_revokes_token_persistently(client: ASGITestClient, test_settings: Settings) -> None:
    """Logging out revokes the token so subsequent requests with that token are rejected."""
    # Login
    login_resp = client.post(
        "/api/admin/auth/login",
        json={
            "username": test_settings.admin_username,
            "password": test_settings.admin_password,
        },
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify token works before logout
    check_before = client.get("/api/admin/auth/me", headers=headers)
    assert check_before.status_code == 200

    # Logout
    logout_resp = client.post("/api/admin/auth/logout", headers=headers)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["success"] is True

    # Token is now revoked -> must return 401
    check_after = client.get("/api/admin/auth/me", headers=headers)
    assert check_after.status_code == 401
    assert check_after.json()["error_code"] == "UNAUTHORIZED"
    assert "revoked" in check_after.json()["detail"].lower()


def test_student_routes_remain_unauthenticated(client: ASGITestClient) -> None:
    """Student chatbot and colleges APIs remain completely public and functional."""
    # Colleges listing
    colleges_resp = client.get("/api/colleges")
    assert colleges_resp.status_code == 200
    assert colleges_resp.json()["total_colleges"] == 5

    # Chat query
    chat_resp = client.post(
        "/api/chat",
        json={"question": "Hello!", "college_id": None},
    )
    assert chat_resp.status_code == 200
    assert chat_resp.json()["response_type"] == "general"
