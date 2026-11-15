"""Admin authentication API routes for login, token revocation (logout), and profile checking."""

from __future__ import annotations

import time

# Simple in‑memory store for login attempts per IP
_login_attempts: dict[str, list[float]] = {}
from fastapi import Request, HTTPException, Response, Depends, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import os
import secrets

from backend.app.utils.admin_auth import (
    AdminAuthError,
    AdminConfigurationError,
    authenticate_admin,
    create_access_token,
    get_current_admin,
    revoke_token,
    validate_jwt_secret,
)
from backend.app.utils.config import Settings, get_settings
from backend.app.utils.schemas import (
    AdminLoginRequest,
    AdminLogoutResponse,
    AdminLoginResponse,
    AdminUserResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/api/admin/auth", tags=["Admin Authentication"])
_bearer = HTTPBearer(auto_error=False)


@router.post(
    "/login",
    response_model=AdminLoginResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid username or password."},
        503: {"model": ErrorResponse, "description": "Admin authentication not configured or weak secret."},
    },
    summary="Admin Login",
    description="Authenticates admin credentials using secure password comparison and issues a signed, expiring JWT access token.",
)
def admin_login(
    payload: AdminLoginRequest,
    settings: Settings = Depends(get_settings),
    request: Request,
    response: Response,
) -> AdminLoginResponse:
    # Rate limiting ... (same as before up to token creation)
    ip = request.client.host
    now = time.time()
    attempts = _login_attempts.get(ip, [])
    attempts = [t for t in attempts if now - t < 60]
    _login_attempts[ip] = attempts
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    if not settings.admin_username or (not settings.admin_password and not settings.admin_password_hash):
        raise AdminConfigurationError("Admin credentials are not configured on this server.")

    valid_secret = validate_jwt_secret(settings.admin_jwt_secret)

    if not authenticate_admin(payload.username, payload.password, settings):
        attempts.append(now)
        _login_attempts[ip] = attempts
        raise AdminAuthError("Invalid username or password.")

    token, expires_in = create_access_token(
        subject=payload.username.strip(),
        secret_key=valid_secret,
        algorithm=settings.admin_jwt_algorithm,
        expires_delta_minutes=settings.admin_token_expiry_minutes,
    )

    same_site = "strict" if os.getenv("PRODUCTION") == "true" else "lax"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=bool(os.getenv("PRODUCTION")),
        samesite=same_site,
        max_age=expires_in,
    )
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="XSRF-TOKEN",
        value=csrf_token,
        httponly=False,
        secure=bool(os.getenv("PRODUCTION")),
        samesite=same_site,
        max_age=expires_in,
    )
    request.state.csrf_token = csrf_token
    return {
        "token_type": "bearer",
        "expires_in": expires_in,
        "username": payload.username.strip(),
    }
    payload: AdminLoginRequest,
    settings: Settings = Depends(get_settings),
    request: Request = Depends(),
) -> AdminTokenResponse:
    # Rate limiting: allow max 5 failed attempts per IP per minute
    ip = request.client.host
    now = time.time()
    # Initialize attempt list for this IP
    attempts = _login_attempts.get(ip, [])
    # Keep only attempts within the last 60 seconds
    attempts = [t for t in attempts if now - t < 60]
    _login_attempts[ip] = attempts
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    """Authenticate administrator and return JWT bearer token."""
    # Ensure admin credentials are affirmatively configured
    if not settings.admin_username or (not settings.admin_password and not settings.admin_password_hash):
        raise AdminConfigurationError("Admin credentials are not configured on this server.")

    # Ensure JWT secret is valid and meets minimum strength
    valid_secret = validate_jwt_secret(settings.admin_jwt_secret)

    if not authenticate_admin(payload.username, payload.password, settings):
        # Record failed attempt for rate limiting
    attempts.append(now)
    _login_attempts[ip] = attempts
    raise AdminAuthError("Invalid username or password.")

    token, expires_in = create_access_token(
        subject=payload.username.strip(),
        secret_key=valid_secret,
        algorithm=settings.admin_jwt_algorithm,
        expires_delta_minutes=settings.admin_token_expiry_minutes,
    )

        # Set HttpOnly cookie for the token
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "username": payload.username.strip(),
    })
    # Determine SameSite based on environment
    same_site = "strict" if os.getenv("PRODUCTION") == "true" else "lax"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=bool(os.getenv("PRODUCTION")),
        samesite=same_site,
        max_age=expires_in,
    )
    # Set CSRF token cookie (non‑HttpOnly) using double‑submit pattern
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="XSRF-TOKEN",
        value=csrf_token,
        httponly=False,
        secure=bool(os.getenv("PRODUCTION")),
        samesite=same_site,
        max_age=expires_in,
    )
    # Store CSRF token in request state for validation (optional)
    request.state.csrf_token = csrf_token
    return response


@router.post(
    "/logout",
    response_model=AdminLogoutResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Missing, invalid or expired token."},
    },
    summary="Admin Logout",
    description="Revokes the active JWT access token on the server so it cannot be reused.",
)
def admin_logout(
    current_admin: AdminUserResponse = Depends(get_current_admin),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
    response: Response,
) -> AdminLogoutResponse:
    """Revoke the current authentication token and clear auth cookies."""
    if credentials:
        revoke_token(
            token=credentials.credentials,
            secret_key=settings.admin_jwt_secret,
            algorithm=settings.admin_jwt_algorithm,
        )
    # Clear cookies set during login
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="XSRF-TOKEN")
    return AdminLogoutResponse(
        message="Successfully logged out.",
        success=True,
    )


@router.get(
    "/me",
    response_model=AdminUserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Missing, invalid or expired token."},
    },
    summary="Current Admin Profile",
    description="Validates the current JWT bearer token and returns administrator identity.",
)
def get_admin_me(
    current_admin: AdminUserResponse = Depends(get_current_admin),
) -> AdminUserResponse:
    """Return the authenticated admin profile."""
    return current_admin

