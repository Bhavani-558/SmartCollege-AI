# Phase 7 – CORS & Configuration Security Audit

## 1. Current CORS configuration (backend/app/main.py)
```python
application.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173"],  # <‑‑ edited during Phase 7
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```
- **allow_origins** – Single explicit origin for the local Vite dev server.
- **allow_credentials** – `False` (cookies, HTTP auth, etc. are not sent).
- **allow_methods** – All standard HTTP verbs are permitted.
- **allow_headers** – Wild‑card (`*`) allows any request header.

## 2. Frontend origins used in the project
| Context | Origin | Source |
|--------|--------|--------|
| Development (Vite) | `http://127.0.0.1:5173` | `frontend/vite.config.ts` (default dev server) and Vite start command (`npm run dev`). |
| Production (not defined) | *None* – the repository contains no production domain configuration. |

The only concrete origin the backend currently knows about is the development origin above.

## 3. Configuration risks
| Risk | Details | Severity |
|------|---------|----------|
| **Over‑permissive HTTP methods** | All CRUD verbs are accepted regardless of whether a route needs them. This widens the attack surface if a new route is added without proper auth checks. | LOW |
| **Wildcard request headers** | `allow_headers=["*"]` permits any custom header, which can be used to bypass simple header‑based filters. | LOW |
| **Missing production origin** | If the application is deployed to a production domain, the current CORS list will reject legitimate browser requests, leading to functional breakage. | INFORMATIONAL |
| **Allow‑credentials disabled** | Good – prevents cookies/HTTP‑auth leakage. | — |

## 4. Environment & secret‑management findings
- **Settings loading** – `backend/app/utils/config.py` uses `pydantic_settings.BaseSettings` with `env_file` pointing to `backend/.env`. This file is present locally and contains:
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, etc.
- **.gitignore** correctly excludes:
  - `.env`, `.env.*`, `backend/.env`, `frontend/.env`
  - Token revocation files, database files, and other secrets.
- **Source code** does **not** embed any secret values; all secrets are pulled from environment variables.
- **Frontend** loads the backend base URL from `frontend/.env.example` (`VITE_API_BASE_URL=http://127.0.0.1:8000`). No secrets are present.
- **Documentation** (README, docs) does not contain actual secret values.

## 5. Recommendations
1. **Restrict allowed methods** to the verbs actually used by the API, e.g.
   ```python
   allow_methods=["GET", "POST", "OPTIONS"]
   ```
   Add additional verbs only where a specific endpoint requires them.
2. **Restrict allowed headers** to a safe whitelist, such as:
   ```python
   allow_headers=["Content-Type", "Authorization", "Accept"]
   ```
3. **Add production origin(s)** – when a production host is known, include it in `allow_origins`. Consider reading the list from an environment variable (e.g. `CORS_ALLOW_ORIGINS`) to avoid code changes per deployment.
4. **Keep `allow_credentials=False`** – this is appropriate for a stateless JWT‑based API.
5. **Validate that `.env` files are never committed** – the existing `.gitignore` already protects them, but enforce a pre‑commit hook in the future.
6. **Document CORS policy** in the README or a dedicated security section to make future reviewers aware of the intended origins and restrictions.

## 6. Does anything require immediate fixing?
- No critical security issue is present; the current configuration is safe for the development environment.
- The **over‑permissive methods and headers** are low‑risk but should be tightened as a best practice.
- Adding a production origin will be required before the app is deployed publicly.

---
*Prepared as part of Phase 7 – focused CORS and configuration security audit.*
