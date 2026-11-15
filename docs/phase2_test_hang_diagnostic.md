# SmartCollege AI — Phase 2 Protected Admin API Test Hang Diagnostic Report

**Date:** November 13, 2026  
**Status:** Root Cause Identified & Verified  
**Component:** Backend Pytest Suite (`backend/tests/test_admin_api.py`)  

---

## 1. Executive Summary

During execution of the Phase 2 test suite (`pytest tests/test_admin_api.py -v`), the test runner collected 9 test items and hung indefinitely on the first test: `test_unauthenticated_admin_endpoints_return_401`.

A comprehensive diagnosis confirmed that:
- **No external network requests, database operations, or file locks** caused the delay.
- **FastAPI application initialization** completed synchronously without error.
- **The hang occurred inside Python's standard library `socket.socketpair()`**, which is invoked during `asyncio.Runner.__enter__()` by the custom `ASGITestClient` fixture on Windows.
- **Root Cause:** In Windows Standard Sandbox Mode (`BypassSandbox: false`), local loopback socket communication (`127.0.0.1`) is blocked by OS-level sandbox network isolation (`[WinError 10013]`). In non-blocking mode, the listener's `accept()` call blocks indefinitely waiting for the loopback connection packet.
- **All running processes have been safely terminated and cleaned up.** Ports 8000 and 5173 are clear, and no files, models, or datasets have been corrupted or modified.

---

## 2. Hanging Test Identification

| Field | Detail |
|---|---|
| **Test Function** | `test_unauthenticated_admin_endpoints_return_401` |
| **File Location** | `backend/tests/test_admin_api.py:39` |
| **Active Fixture** | `client: ASGITestClient` (`backend/tests/conftest.py:89`) |
| **Exact Execution Point** | `conftest.py:93` &rarr; `with ASGITestClient(application) as test_client:` &rarr; `conftest.py:35` &rarr; `self._runner.__enter__()` |
| **Underlying Call** | `asyncio.Runner.__enter__()` &rarr; `BaseProactorEventLoop._make_self_pipe()` &rarr; `socket.socketpair()` &rarr; `lsock.accept()` |

### Test Runner Output Prior to Cancellation
```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.1.1, pluggy-1.6.0 -- C:\Python314\python.exe
cachedir: .pytest_cache
rootdir: D:\TechGlobal_Mini\AI-Student-Chatbot\backend
plugins: anyio-3.7.1
collecting ... collected 9 items

tests/test_admin_api.py::test_unauthenticated_admin_endpoints_return_401 
```

The test runner never entered the body of `test_unauthenticated_admin_endpoints_return_401` because it hung during session fixture setup.

---

## 3. Investigation of Diagnostic Vectors

### 3.1 HTTP / Network Activity
- The test suite makes no outbound external HTTP requests. All API calls target the in-memory ASGI transport (`http://testserver`).
- However, Python's internal `asyncio` event loop on Windows creates a local loopback TCP socketpair (`127.0.0.1`) for thread signaling (`_make_self_pipe`). This internal loopback connection was blocked by sandbox network isolation.

### 3.2 Database Operations
- The application runtime is configured with `faq_backend="json"` and `database_url=None`.
- No PostgreSQL connections, connection pools, or database queries were executed or waiting.

### 3.3 File Locks & I/O
- `test_settings` fixture copied `colleges.json` and `college_faq.json` to an isolated temporary directory (`tmp_path_factory.mktemp("admin_test_data")`).
- Disk reads and writes completed successfully. There were no file locks or filesystem deadlocks.

### 3.4 Subprocess Status & Lingering Processes
- An inspection using PowerShell confirmed that no orphaned Python or pytest processes remained running:
  - `Get-Process -Name python*, pytest*` &rarr; Zero active processes.
  - `Get-NetTCPConnection -LocalPort 8000, 5173` &rarr; Ports are fully freed.

### 3.5 FastAPI Application & Test Client State
- `create_app()` executed completely and returned the configured `FastAPI` instance.
- The test client (`ASGITestClient`) is a custom synchronous wrapper designed to bridge `httpx 0.28` and `FastAPI 0.104` (since `starlette.testclient.TestClient` in this environment raises `TypeError: Client.__init__() got an unexpected keyword argument 'app'`).
- In `ASGITestClient.__enter__()`, calling `self._runner.__enter__()` initializes the event loop, triggering the Windows Winsock block.

---

## 4. Root Cause Analysis & Empirical Proof

### Call Stack Mechanism
1. On Windows with Python 3.14, the default event loop policy is `WindowsProactorEventLoopPolicy`.
2. When `asyncio.Runner()` starts its event loop, `BaseProactorEventLoop.__init__()` calls `self._make_self_pipe()`.
3. `_make_self_pipe()` executes Python's `socket.socketpair()`:
   ```python
   # socket.py line 28
   lsock.bind((host, 0))
   lsock.listen()
   addr, port = lsock.getsockname()[:2]
   csock = socket(family, type, proto)
   csock.setblocking(False)
   csock.connect((addr, port))
   csock.setblocking(True)
   ssock, _ = lsock.accept()  # <-- HANGS HERE
   ```
4. In **Standard Sandbox Mode (`BypassSandbox: false`)**, outbound TCP socket creation and connection to `127.0.0.1` is restricted by sandbox security filters (`[WinError 10013]`). In non-blocking mode, the connection request is dropped/delayed, and `lsock.accept()` hangs indefinitely waiting for the loopback connection handshake.

### Empirical Proof
We isolated and tested the primitives independently:

1. **`socket.socketpair()` inside Standard Sandbox Mode:**
   - Command: `python -c "import socket; socket.socketpair()"`
   - Result: **Hangs indefinitely** on `lsock.accept()` (killed after timeout).

2. **`socket.socketpair()` with `BypassSandbox: true`:**
   - Command: `python -c "import socket; socket.socketpair()"`
   - Result: **Completes successfully in < 10 ms**.

3. **`ASGITestClient` probe with `BypassSandbox: true`:**
   - Command: `python -c "from backend.app.main import create_app; from backend.tests.conftest import ASGITestClient; app = create_app(); with ASGITestClient(app) as c: print(c.get('/api/admin/stats').status_code)"`
   - Result: **Instant response (HTTP 401 Unauthorized)**.

---

## 5. Recommended Fix

### Primary Recommendation: Run Pytest Outside the Sandbox (`BypassSandbox: true`)
Because Python's `asyncio` on Windows natively requires a loopback socket (`127.0.0.1`) for inter-thread synchronization in `ProactorEventLoop`, all test runs exercising `asyncio` or `ASGITestClient` must run with `BypassSandbox: true`.

Execution rules explicitly allow bypassing the sandbox when network/socket access is required:
> *"Stick to What Works: If a command that typically requires network (e.g., kubectl) succeeds in the sandbox, continue running it... Do not switch to bypass unless it actually blocks."*
> Here, sandbox loopback blocking is definitively verified.

### Verification Command Shape
Run the admin API test suite with sandbox bypass:
```powershell
cd "D:\TechGlobal_Mini\AI-Student-Chatbot\backend"
& "C:\Python314\python.exe" -m pytest tests/test_admin_api.py -v
```
*(with `BypassSandbox: true`)*

### Integrity Confirmation
- Application code in `backend/app/` is intact and unmodified.
- Dataset files (`dataset/processed/colleges.json` and `dataset/processed/college_faq.json`) are untouched.
- NLP intent classification model (`models/intent_model.joblib`) is untouched.
- No orphan processes are running.

