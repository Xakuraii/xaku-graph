# Developer Setup Guide

## System Prerequisites
- **Operating System:** Windows 10/11, Linux, or macOS
- **Python:** 3.12 (with `uv` recommended)
- **Node.js:** >= 20.x with `npm`
- **Rust & Cargo:** >= 1.80

## Quick Setup (PowerShell)
```powershell
# 1. Start local servers
./scripts/dev.ps1

# 2. Run quality checks
./scripts/check.ps1

# 3. Run automated tests
./scripts/test.ps1

# 4. Build application
./scripts/build.ps1
```

## Manual Setup Steps

### Backend
```powershell
cd backend
uv venv --python 3.12 .venv
uv pip install -e ".[dev]"
.venv\Scripts\pytest
```

### Frontend
```powershell
cd web
npm install
npm test
npm run build
```

### Rust Core
```powershell
cargo test -p xakugraph-core
```
