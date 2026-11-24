# Agentix Desktop — Compilation & Build Guide

This document explains the multi-stage packaging process for compiling production bundles of Agentix for **macOS** (`.dmg`, `.app`) and **Windows** (`.msi`, `.exe`).

---

## 1. Build Pipeline Overview

```
Stage 1: Python PyInstaller Freeze
  backend/desktop_entry.py + core/ + PyTorch/scikit-learn/Polars/FastAPI
  ──> desktop/src-tauri/bin/agentix-backend-<target-triple>

Stage 2: Next.js Frontend Optimization
  frontend/src/ + Tailwind CSS + Static Pages
  ──> Next.js build output (or static export assets)

Stage 3: Tauri Native Compilation & Packaging
  desktop/src-tauri/src/ + icons/ + sidecar binary
  ──> .dmg / .app (macOS) or .msi / .exe (Windows)
```

---

## 2. Stage 1: Compiling the Python Sidecar

Run the platform-specific build script:

### On macOS (Apple Silicon or Intel)
```bash
chmod +x packaging/pyinstaller/build_backend.sh
./packaging/pyinstaller/build_backend.sh
```
- Built binary location: `packaging/dist/agentix-backend`
- Target sidecar location: `desktop/src-tauri/bin/agentix-backend-aarch64-apple-darwin` (or `x86_64-apple-darwin`)

### On Windows
```cmd
packaging\pyinstaller\build_backend.bat
```
- Target sidecar location: `desktop\src-tauri\bin\agentix-backend-x86_64-pc-windows-msvc.exe`

---

## 3. Stage 2: Preparing the Frontend Assets

```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 4. Stage 3: Compiling the Native Desktop Installer

Ensure the sidecar binary exists in `desktop/src-tauri/bin/` with the exact target triple suffix reported by `rustc -vV`.

Then build the release bundle:
```bash
cd desktop
npm install
npm run tauri build
```

### Build Artifact Locations
- **macOS DMG**: `desktop/src-tauri/target/release/bundle/dmg/Agentix_1.0.0_aarch64.dmg`
- **macOS App**: `desktop/src-tauri/target/release/bundle/macos/Agentix.app`
- **Windows MSI**: `desktop/src-tauri/target/release/bundle/msi/Agentix_1.0.0_x64_en-US.msi`
- **Windows NSIS**: `desktop/src-tauri/target/release/bundle/nsis/Agentix_1.0.0_x64-setup.exe`

---

## 5. Checksum Verification

Always generate and distribute SHA-256 checksums alongside released binaries:
```bash
# macOS / Linux
shasum -a 256 desktop/src-tauri/target/release/bundle/dmg/*.dmg > SHA256SUMS.txt

# Windows PowerShell
Get-FileHash desktop\src-tauri\target\release\bundle\msi\*.msi -Algorithm SHA256
```
