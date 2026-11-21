# ==============================================================================
# XakuGraph Automated Test Suite Launcher (Windows PowerShell)
# Runs Rust unit tests, Python pytest suite, and Vitest frontend tests.
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Running XakuGraph Test Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Rust Core & Desktop Tests
Write-Host "`n[1/3] Running Rust Unit & Mathematical Tests..." -ForegroundColor Green
cargo test -p xakugraph-core
if ($LASTEXITCODE -ne 0) {
    Write-Error "Rust core tests failed."
    exit $LASTEXITCODE
}
cargo test -p xakugraph-desktop
if ($LASTEXITCODE -ne 0) {
    Write-Error "Rust desktop tests failed."
    exit $LASTEXITCODE
}

# 2. Python Backend Tests
Write-Host "`n[2/3] Running Python Backend pytest Suite..." -ForegroundColor Green
$BackendDir = Join-Path $ProjectRoot "backend"
$PytestBin = Join-Path $BackendDir ".venv\Scripts\pytest.exe"
if (-not (Test-Path $PytestBin)) {
    Write-Error "Backend virtual environment not initialized. Run ./scripts/dev.ps1 or uv venv in backend/."
    exit 1
}
Push-Location $BackendDir
try {
    & $PytestBin
} finally {
    Pop-Location
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Python backend tests failed."
    exit $LASTEXITCODE
}

# 3. Frontend Vitest Tests
Write-Host "`n[3/3] Running Web Frontend Vitest Suite..." -ForegroundColor Green
$WebDir = Join-Path $ProjectRoot "web"
Push-Location $WebDir
try {
    npm test
} finally {
    Pop-Location
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend tests failed."
    exit $LASTEXITCODE
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  All test suites passed successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
