# ==============================================================================
# XakuGraph Linter & Quality Checker (Windows PowerShell)
# Validates Python (Ruff), Frontend (TypeScript), and Rust (cargo check).
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Running XakuGraph Quality & Lint Checks" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Python Linting & Formatting Check
Write-Host "`n[1/3] Checking Python (Ruff lint & format)..." -ForegroundColor Green
$BackendDir = Join-Path $ProjectRoot "backend"
$RuffBin = Join-Path $BackendDir ".venv\Scripts\ruff.exe"
if (Test-Path $RuffBin) {
    Push-Location $BackendDir
    try {
        & $RuffBin check app tests
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & $RuffBin format --check app tests
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
        Pop-Location
    }
} else {
    Write-Warning "Ruff binary not found in backend/.venv. Skipping Python lint check."
}

# 2. Frontend Type Checking
Write-Host "`n[2/3] Checking Frontend TypeScript (tsc --noEmit)..." -ForegroundColor Green
$WebDir = Join-Path $ProjectRoot "web"
Push-Location $WebDir
try {
    npm run lint
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

# 3. Rust Workspace Check
Write-Host "`n[3/3] Checking Rust Crates (cargo check)..." -ForegroundColor Green
cargo check -p xakugraph-core
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cargo check -p xakugraph-desktop
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  All quality checks passed cleanly!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
