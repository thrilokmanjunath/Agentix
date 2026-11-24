@echo off
REM Agentix Desktop Backend PyInstaller Build Script for Windows
setlocal enabledelayedexpansion

echo === [AGENTIX] Building Windows Desktop Backend Sidecar ===

set REPO_ROOT=%~dp0..\..
set SCRIPT_DIR=%~dp0

set DIST_DIR=%REPO_ROOT%\packaging\dist
set BUILD_DIR=%REPO_ROOT%\packaging\build
set TAURI_BIN_DIR=%REPO_ROOT%\desktop\src-tauri\bin

if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if not exist "%TAURI_BIN_DIR%" mkdir "%TAURI_BIN_DIR%"

python -m PyInstaller ^
    --clean ^
    --noconfirm ^
    --distpath "%DIST_DIR%" ^
    --workpath "%BUILD_DIR%" ^
    "%SCRIPT_DIR%backend.spec"

if not exist "%DIST_DIR%\agentix-backend.exe" (
    echo [ERROR] Build failed: agentix-backend.exe not found!
    exit /b 1
)

copy /y "%DIST_DIR%\agentix-backend.exe" "%TAURI_BIN_DIR%\agentix-backend-x86_64-pc-windows-msvc.exe"
echo === [AGENTIX] Windows Desktop Backend Built Successfully ===
