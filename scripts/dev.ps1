# ==============================================================================
# XakuGraph Local Development Launcher (Windows PowerShell)
# Starts FastAPI backend (port 8000), Vite frontend (port 5173), and XakuGraph
# Tauri desktop window concurrently without rebuilding if debug binary exists.
# Pass -WebOnly to skip desktop, or -Rebuild to recompile the desktop binary.
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$Desktop = $false,
    [switch]$WebOnly = $false,
    [switch]$Rebuild = $false
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
$hasCargo = Get-Command cargo -ErrorAction SilentlyContinue

if (-not $hasPython) {
    Write-Error "Python 3.12 is required but not found in PATH."
    exit 1
}
if (-not $hasNode) {
    Write-Error "Node.js (>= 18) is required but not found in PATH."
    exit 1
}

$DesktopDebugExe = Join-Path $ProjectRoot "target\debug\xakugraph-desktop.exe"
$LaunchDesktop = (-not $WebOnly) -or $Desktop

if ($LaunchDesktop -and -not (Test-Path $DesktopDebugExe) -and -not $hasCargo) {
    if ($Desktop) {
        Write-Error "Desktop executable not found and Rust/Cargo is unavailable."
        exit 1
    }
    Write-Warning "Desktop executable and Rust/Cargo not found; falling back to Web-only mode."
    $LaunchDesktop = $false
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
    try {
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
        Pop-Location
    }
}

# 4. Build Desktop Debug Binary Only If Missing or Explicitly Requested
if ($LaunchDesktop -and ($Rebuild -or -not (Test-Path $DesktopDebugExe))) {
    Write-Host "`n[Setup] Building XakuGraph desktop debug executable (one-time)..." -ForegroundColor Yellow
    & cargo build -p xakugraph-desktop
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# 5. Start Local Processes
Write-Host "`n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$BackendJob = Start-Process -FilePath $VenvPython -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $BackendDir -PassThru

Write-Host "[2/3] Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
$FrontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $WebDir -PassThru

$DesktopJob = $null
if ($LaunchDesktop) {
    # Wait briefly for Vite dev server so the desktop window loads on first paint
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
        if ($FrontendJob.HasExited) { break }
        try {
            $probe = New-Object System.Net.Sockets.TcpClient
            $async = $probe.BeginConnect("localhost", 5173, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne(250, $false) -and $probe.Connected) {
                $probe.Close()
                break
            }
            $probe.Close()
        } catch {
            # Ignore while Vite is still binding port 5173
        }
        Start-Sleep -Milliseconds 200
    }

    Write-Host "[3/3] Launching XakuGraph Desktop App ($DesktopDebugExe)..." -ForegroundColor Green
    $DesktopJob = Start-Process -FilePath $DesktopDebugExe -WorkingDirectory $ProjectRoot -PassThru
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  XakuGraph is live:" -ForegroundColor Green
if ($LaunchDesktop) {
    Write-Host "  - Desktop App:   XakuGraph Native Window (Tauri 2)" -ForegroundColor White
}
Write-Host "  - Web Studio:    http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:   http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - OpenAPI Docs:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Close the desktop window or press [Ctrl+C] to stop all services.`n" -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($BackendJob.HasExited) {
            Write-Warning "Backend process terminated."
            break
        }
        if ($FrontendJob.HasExited) {
            Write-Warning "Frontend process terminated."
            break
        }
        if ($DesktopJob -and $DesktopJob.HasExited) {
            Write-Host "`nDesktop window closed. Shutting down services..." -ForegroundColor Yellow
            break
        }
    }
} finally {
    Write-Host "`n[Stopping] Terminating XakuGraph development processes..." -ForegroundColor Yellow
    foreach ($proc in @($DesktopJob, $FrontendJob, $BackendJob)) {
        if ($proc -and -not $proc.HasExited) {
            & taskkill /PID $proc.Id /T /F 2>$null | Out-Null
        }
    }
    Write-Host "[Stopped] Development services shut down cleanly." -ForegroundColor Green
}
