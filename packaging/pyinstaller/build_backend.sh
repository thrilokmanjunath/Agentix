#!/usr/bin/env bash
set -euo pipefail

# Agentix Desktop Backend PyInstaller Build Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== [AGENTIX] Building Desktop Backend Sidecar ==="
echo "Repository Root: ${REPO_ROOT}"

# Activate virtual environment
if [ -d "${REPO_ROOT}/backend/.venv" ]; then
    PYTHON="${REPO_ROOT}/backend/.venv/bin/python"
    PYINSTALLER="${REPO_ROOT}/backend/.venv/bin/pyinstaller"
else
    PYTHON="$(which python3)"
    PYINSTALLER="$(which pyinstaller)"
fi

echo "Using Python: ${PYTHON}"
echo "Using PyInstaller: ${PYINSTALLER}"

# Determine target architecture triple
ARCH="$(uname -m)"
OS="$(uname -s)"

if [ "${OS}" = "Darwin" ]; then
    if [ "${ARCH}" = "arm64" ]; then
        TRIPLE="aarch64-apple-darwin"
    else
        TRIPLE="x86_64-apple-darwin"
    fi
    EXT=""
elif [ "${OS}" = "Linux" ]; then
    if [ "${ARCH}" = "aarch64" ]; then
        TRIPLE="aarch64-unknown-linux-gnu"
    else
        TRIPLE="x86_64-unknown-linux-gnu"
    fi
    EXT=""
else
    TRIPLE="x86_64-pc-windows-msvc"
    EXT=".exe"
fi

echo "Target Platform: ${TRIPLE}"

DIST_DIR="${REPO_ROOT}/packaging/dist"
BUILD_DIR="${REPO_ROOT}/packaging/build"
TAURI_BIN_DIR="${REPO_ROOT}/desktop/src-tauri/bin"

mkdir -p "${DIST_DIR}" "${BUILD_DIR}" "${TAURI_BIN_DIR}"

# Run PyInstaller
echo "Running PyInstaller build..."
"${PYINSTALLER}" \
    --clean \
    --noconfirm \
    --distpath "${DIST_DIR}" \
    --workpath "${BUILD_DIR}" \
    "${SCRIPT_DIR}/backend.spec"

RAW_BINARY="${DIST_DIR}/agentix-backend${EXT}"

if [ ! -f "${RAW_BINARY}" ]; then
    echo "ERROR: Built binary not found at ${RAW_BINARY}" >&2
    exit 1
fi

chmod +x "${RAW_BINARY}"

# Copy to Tauri sidecar location with standard Tauri binary naming format
TARGET_BINARY="${TAURI_BIN_DIR}/agentix-backend-${TRIPLE}${EXT}"
cp -f "${RAW_BINARY}" "${TARGET_BINARY}"
chmod +x "${TARGET_BINARY}"

echo "=== [AGENTIX] Desktop Backend Built Successfully ==="
echo "Raw Binary:    ${RAW_BINARY} ($(du -sh "${RAW_BINARY}" | cut -f1))"
echo "Tauri Sidecar: ${TARGET_BINARY}"
