# ==============================================================================
# XakuGraph Local Development Launcher (Windows PowerShell)
# Starts FastAPI backend (port 8000) and Vite frontend (port 5173) concurrently.
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$Desktop = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting XakuGraph Local-First Development Studio" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Prerequisites
$hasPython = Get-Command python -ErrorAction SilentlyContinue
$hasUv = Get-Command uv -ErrorAction SilentlyContinue
$hasNode = Get-Command node -ErrorAction SilentlyContinue

if (-not $hasPython) {
    Write-Error "Python 3.12 is required but not found in PATH."
    exit 1
}
if (-not $hasNode) {
    Write-Error "Node.js (>= 18) is required but not found in PATH."
    exit 1
}

# 2. Check Backend Virtual Environment
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "[Setup] Initializing Python virtual environment with uv..." -ForegroundColor Yellow
    if ($hasUv) {
        & uv venv --python 3.12 (Join-Path $BackendDir ".venv")
        & uv pip install -e "$BackendDir[dev]"
    } else {
        & python -m venv (Join-Path $BackendDir ".venv")
        & (Join-Path $BackendDir ".venv\Scripts\pip.exe") install -e "$BackendDir[dev]"
    }
}

# 3. Check Frontend node_modules
$WebDir = Join-Path $ProjectRoot "web"
$WebModules = Join-Path $WebDir "node_modules"
if (-not (Test-Path $WebModules)) {
    Write-Host "[Setup] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $WebDir
    & npm install
    Pop-Location
}

# 4. Start Background Processes
Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$BackendJob = Start-Process -FilePath $VenvPython -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $BackendDir -PassThru

Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
$FrontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $WebDir -PassThru

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  XakuGraph is live:" -ForegroundColor Green
Write-Host "  - Web Studio:    http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:   http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - OpenAPI Docs:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press [Ctrl+C] to stop all local development services.`n" -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($BackendJob.HasExited) {
            Write-Warning "Backend process terminated unexpectedly."
            break
        }
        if ($FrontendJob.HasExited) {
            Write-Warning "Frontend process terminated unexpectedly."
            break
        }
    }
} finally {
    Write-Host "`n[Stopping] Terminating XakuGraph development servers..." -ForegroundColor Yellow
    if ($BackendJob -and -not $BackendJob.HasExited) {
        Stop-Process -Id $BackendJob.Id -Force -ErrorAction SilentlyContinue
    }
    if ($FrontendJob -and -not $FrontendJob.HasExited) {
        Stop-Process -Id $FrontendJob.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[Stopped] Development services shut down cleanly." -ForegroundColor Green
}
