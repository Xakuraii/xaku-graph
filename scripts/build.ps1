# ==============================================================================
# XakuGraph Build Script (Windows PowerShell)
# Builds Frontend, Rust Core, and optionally Desktop / Backend distributions.
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$Desktop = $false,
    [switch]$Release = $true
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Building XakuGraph Monorepo" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build Rust Core Crate
Write-Host "`n[1/3] Building Rust core crate (xakugraph-core)..." -ForegroundColor Green
if ($Release) {
    cargo build --release -p xakugraph-core
} else {
    cargo build -p xakugraph-core
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2. Build Frontend (Vite + TypeScript)
Write-Host "`n[2/3] Building Web Frontend distribution..." -ForegroundColor Green
$WebDir = Join-Path $ProjectRoot "web"
Push-Location $WebDir
try {
    npm run build
} finally {
    Pop-Location
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Optional Desktop Shell Build
if ($Desktop) {
    Write-Host "`n[3/3] Building Tauri Desktop Shell..." -ForegroundColor Green
    $DesktopDir = Join-Path $ProjectRoot "desktop"
    Push-Location $DesktopDir
    try {
        npx @tauri-apps/cli build
    } finally {
        Pop-Location
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "`n[3/3] Desktop shell build skipped (pass -Desktop to build Windows installer/bundle)." -ForegroundColor Gray
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  Build completed successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
