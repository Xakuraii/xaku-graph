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

function Test-TcpPort {
    param(
        [string]$TargetHost,
        [int]$Port,
        [int]$TimeoutMs = 250
    )
    $probe = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $probe.BeginConnect($TargetHost, $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne($TimeoutMs, $false) -and $probe.Connected) {
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $probe.Close()
    }
}

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

$BackendJob = $null
$FrontendJob = $null
$DesktopJob = $null

try {
    # 5. Start or Reuse FastAPI Backend
    if (Test-TcpPort -TargetHost "127.0.0.1" -Port 8000) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 2
            if ($health.status -eq "healthy") {
                Write-Host "`n[1/3] Reusing running XakuGraph Backend on http://127.0.0.1:8000 (v$($health.version))." -ForegroundColor Green
            } else {
                Write-Error "Port 8000 is already in use by another process. Stop it and retry."
                exit 1
            }
        } catch {
            Write-Error "Port 8000 is already in use by a non-XakuGraph process. Stop that process and retry."
            exit 1
        }
    } else {
        Write-Host "`n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
        $BackendJob = Start-Process -FilePath $VenvPython -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $BackendDir -NoNewWindow -PassThru
    }

    # 6. Start or Reuse Vite Frontend
    if (Test-TcpPort -TargetHost "localhost" -Port 5173) {
        Write-Host "[2/3] Reusing running Vite Frontend on http://localhost:5173 ." -ForegroundColor Green
    } else {
        Write-Host "[2/3] Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
        $FrontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $WebDir -NoNewWindow -PassThru
    }

    # 7. Wait briefly for Backend & Frontend readiness before opening Desktop
    if ($BackendJob) {
        $backendDeadline = (Get-Date).AddSeconds(15)
        while ((Get-Date) -lt $backendDeadline) {
            if ($BackendJob.HasExited) { break }
            if (Test-TcpPort -TargetHost "127.0.0.1" -Port 8000) { break }
            Start-Sleep -Milliseconds 200
        }
        if ($BackendJob.HasExited) {
            Write-Error "FastAPI backend failed to start (exit code $($BackendJob.ExitCode))."
            exit 1
        }
    }

    if ($LaunchDesktop) {
        if ($FrontendJob) {
            $viteDeadline = (Get-Date).AddSeconds(20)
            while ((Get-Date) -lt $viteDeadline) {
                if ($FrontendJob.HasExited) { break }
                if (Test-TcpPort -TargetHost "localhost" -Port 5173) { break }
                Start-Sleep -Milliseconds 200
            }
            if ($FrontendJob.HasExited) {
                Write-Error "Vite frontend failed to start (exit code $($FrontendJob.ExitCode))."
                exit 1
            }
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

    while ($true) {
        Start-Sleep -Seconds 1
        if ($BackendJob -and $BackendJob.HasExited) {
            Write-Warning "Backend process terminated."
            break
        }
        if ($FrontendJob -and $FrontendJob.HasExited) {
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
