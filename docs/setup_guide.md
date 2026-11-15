# SmartCollege AI — Complete Installation & Setup Guide

**Target Environment:** Windows 10/11, macOS, or Linux  
**Runtime Requirements:** Python `3.11+` (tested on `3.14.3`) | Node.js `18+` or `20+` (tested on `24.13.0` / npm `11.16.0`)  
**Project Path:** `D:\TechGlobal_Mini\AI-Student-Chatbot`  

---

## 1. Prerequisites Checklist

Before beginning setup, verify that your development environment contains:

1. **Python 3.11 or higher:**
   ```powershell
   python --version
   ```
2. **Node.js 18 or higher & npm:**
   ```powershell
   node --version
   npm --version
   ```
3. **Git (Optional for version control):**
   ```powershell
   git --version
   ```

---

## 2. Backend Installation and Setup

### Step 2.1 — Navigate to the Project Root
Open a terminal in the root project folder:
```powershell
cd D:\TechGlobal_Mini\AI-Student-Chatbot
```

### Step 2.2 — Create and Activate a Virtual Environment (Recommended)
```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 2.3 — Install Backend Dependencies
Install all required libraries specified in `backend/requirements.txt`:
```powershell
pip install -r backend/requirements.txt
```

### Step 2.4 — Configure Backend Environment Variables
Copy the template configuration file:
```powershell
cp backend\.env.example backend\.env
```
Open `backend/.env` in your text editor and customize the settings:
```env
# Active data storage backend ("json" default, or "postgres")
FAQ_BACKEND=json

# NLP classification threshold
CONFIDENCE_THRESHOLD=0.25

# Administrator Credentials (Set your preferred credentials)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPassword2026!

# Cryptographic JWT Secret Key (Must be at least 32 characters)
ADMIN_JWT_SECRET=4f9b2d8e1a7c3f5e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f
```

> [!TIP]
> **Generating a Secure JWT Secret:**
> You can easily generate a cryptographically strong 64-character hex secret with Python:
> ```powershell
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## 3. Frontend Installation and Setup

### Step 3.1 — Navigate to the Frontend Directory
Open a separate terminal window:
```powershell
cd D:\TechGlobal_Mini\AI-Student-Chatbot\frontend
```

### Step 3.2 — Install Node Dependencies
```powershell
npm install
```

### Step 3.3 — Configure Frontend Environment Variables
Copy the frontend environment template:
```powershell
cp .env.example .env
```
Ensure `frontend/.env` contains the API base URL matching your backend port:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 4. Running the Application Locally

To run the full stack, start both development servers concurrently:

### Terminal 1 — Start FastAPI Backend
From `D:\TechGlobal_Mini\AI-Student-Chatbot`:
```powershell
$env:PYTHONPATH="D:\TechGlobal_Mini\AI-Student-Chatbot"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API Root:** `http://127.0.0.1:8000/`
- **Interactive Swagger Documentation:** `http://127.0.0.1:8000/docs`
- **System Health Check:** `http://127.0.0.1:8000/health`

### Terminal 2 — Start React / Vite Frontend
From `D:\TechGlobal_Mini\AI-Student-Chatbot\frontend`:
```powershell
npm run dev
```
- **Student Portal & Chatbot:** `http://127.0.0.1:5173/` or `http://127.0.0.1:5173/chat`
- **Admin Authentication Portal:** `http://127.0.0.1:5173/admin/login`
- **Admin Dashboard Console:** `http://127.0.0.1:5173/admin`

---

## 5. Verification and Smoke Testing

Verify the installation by running the automated test suites:

### 5.1 Run Complete Backend Tests
From `D:\TechGlobal_Mini\AI-Student-Chatbot`:
```powershell
python -m pytest backend/tests -v
```
*Expected: 111 passed.*

### 5.2 Run Frontend Unit & Component Tests
From `D:\TechGlobal_Mini\AI-Student-Chatbot\frontend`:
```powershell
npm test -- --run
```
*Expected: 18 passed across 4 test suites.*

### 5.3 Verify TypeScript & Production Build
From `D:\TechGlobal_Mini\AI-Student-Chatbot\frontend`:
```powershell
npx tsc -b
npm run build
```
*Expected: 0 compiler errors, optimized production bundle generated in `frontend/dist/`.*

---

## 6. Common Troubleshooting

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| `ModuleNotFoundError: No module named 'backend'` | `PYTHONPATH` not pointing to project root | Set `$env:PYTHONPATH="D:\TechGlobal_Mini\AI-Student-Chatbot"` before launching Python scripts. |
| `401 Unauthorized` on admin login | Missing or mismatched `.env` credentials | Verify that `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `backend/.env` match the input credentials. |
| `Network Error` when sending chat message | Backend is stopped or port mismatch | Confirm FastAPI is running on `127.0.0.1:8000` and matches `VITE_API_BASE_URL` in `frontend/.env`. |
| `EPERM` or file lock errors on Windows | Fast sequential writes locking files | The platform utilizes atomic UUID replacement with retry backoff (`_atomic_replace`). Ensure antivirus is not locking temp files. |

