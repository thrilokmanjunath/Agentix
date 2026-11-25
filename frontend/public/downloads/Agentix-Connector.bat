@echo off
title Agentix Local AI Connector
echo ===================================================
echo   Agentix Universal Local AI Connector Companion
echo ===================================================
echo.
echo Checking for Python 3.8+...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not found in PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

python --version
echo Starting Agentix Connector gateway on http://127.0.0.1:11435...
echo Connecting to local Ollama (11434) and LM Studio (1234)...
echo.
python "%~dp0agentix_connector.py"
pause
