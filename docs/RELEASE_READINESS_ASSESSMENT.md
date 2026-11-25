# Agentix Native Desktop — Release Readiness Assessment & Verification Dossier

**Release Target:** v1.0.0  
**Assessment Date:** 2026-11-25  
**Auditor Roles:** Principal Release Engineer, DevOps Lead, QA Architect  
**Distribution Repository:** `https://github.com/thrilokmanjunath/Agentix`

---

## 1. Release Verdict & Readiness Status

| Target Platform | Package Format | Status | Readiness Level | Verdict |
| :--- | :---: | :---: | :---: | :---: |
| **macOS Apple Silicon (ARM64)** | `.dmg` (235 MB) | **BUILT & TESTED** | Production Grade | **RELEASE APPROVED** |
| **macOS Intel (x86_64)** | `.dmg` | **CI QUEUED** | Production Staged | **PENDING RUNNER** |
| **Windows 10 / 11 (x64)** | `.msi` (Native) | **CI QUEUED** | Production Staged | **PENDING RUNNER** |
| **Windows Companion** | `.bat` / `.py` (Universal) | **BUILT & VERIFIED** | Production Ready | **RELEASE APPROVED** |

---

## 2. Official Checksum Manifest (SHA-256)

All release binaries and distribution packages have been hashed using SHA-256:

```
a04c3ae17cc2a425e041f11eb164f1ca5df94fbe4a336abbf1834f6519e73e52  Agentix-1.0.0-arm64.dmg
9b9ce0135b09d83ee28bbba62280e20bdc0cb32999b4091ef8e18f3fca7ec12f  Agentix-Connector.bat
1cb97d1907a993289eb22993d9c0ced6554f4477ece4136ad7493a8c2db9cf57  agentix_connector.py
```

---

## 3. Root Cause Analysis of User-Reported Installation Errors

### 3.1. Windows Installer Error ("This installation package could not be opened...")
* **User Symptom:** Double-clicking `Agentix-1.0.0-x64.msi` on Windows resulted in a fatal Windows Installer dialogue box stating: *"This installation package could not be opened. Contact the application vendor to verify that this is a valid Windows Installer package."*
* **Root Cause Discovered:**
  - `frontend/public/downloads/Agentix-1.0.0-x64.msi` was a 4.6 KB mock text file containing an artificial hex stub (`d0 cf 11 e0...`). It completely lacked the Windows Installer WiX database tables (`_SummaryInformation`, `File`, `Component`, `Registry`).
* **Permanent Remediation:**
  1. The invalid 4.6 KB mock file was removed from the repository.
  2. The download route `/download/windows` now redirects to verified GitHub Release assets or serves the **Agentix Universal Connector (`Agentix-Connector.bat`)**.
  3. GitHub Actions workflow `.github/workflows/build-desktop.yml` was upgraded to compile genuine native `.msi` packages using the WiX toolset on a Windows runner.

### 3.2. macOS Gatekeeper Dialogue ("Apple could not verify Agentix...")
* **User Symptom:** Opening `Agentix.app` on macOS showed a Gatekeeper alert: *"Agentix Not Opened. Apple could not verify Agentix is free of malware that may harm your Mac..."*
* **Root Cause Discovered:**
  - The previous `.dmg` was a 171 KB mock wrapper containing a shell script that called `open http://localhost:3000`.
  - When downloaded via a web browser (Safari/Chrome), macOS automatically applies the `com.apple.quarantine` extended attribute. Without an Apple Developer ID paid membership signing certificate and Apple Notary Service ticket, Gatekeeper flags un-notarized downloads.
* **Remediation & Workaround:**
  1. Built the genuine **235 MB Apple Silicon ARM64 DMG** containing the real Mach-O ARM64 Tauri shell and PyInstaller FastAPI sidecar.
  2. Users can bypass the macOS quarantine flag by either:
     - **Right-Click Method:** Right-click (or Control-click) `Agentix.app` in Finder, select **Open**, and click **Open** in the prompt.
     - **Terminal Command:** Run `xattr -cr /Applications/Agentix.app` to strip the quarantine attribute.
  3. Documented enterprise code-signing instructions in `docs/CODE_SIGNING.md` for submitting to Apple Notary Service (`xcrun notarytool submit`).

---

## 4. End-User Installation & Verification Guide

### 4.1. macOS Apple Silicon (ARM64)
1. Download `Agentix-1.0.0-arm64.dmg` from `https://github.com/thrilokmanjunath/Agentix/releases/tag/v1.0.0` or `https://agentix-bay.vercel.app/download/mac`.
2. Double-click the `.dmg` to mount the disk image.
3. Drag `Agentix.app` into your **Applications** folder.
4. Launch `Agentix.app`.
   - *Note on first launch:* If Gatekeeper prompts that the developer cannot be verified, right-click `Agentix.app` and choose **Open**.
5. The application will launch with zero terminal windows, zero browser popups, and automatically start its local FastAPI engine on an isolated dynamic port.

### 4.2. Windows (Universal Companion)
1. Download `Agentix-Connector.bat` and `agentix_connector.py` from `https://agentix-bay.vercel.app/download/windows?type=bat`.
2. Ensure Python 3.8+ is installed on Windows.
3. Double-click `Agentix-Connector.bat`.
4. The connector gateway will initialize on `http://127.0.0.1:11435` and link seamlessly with both local Ollama models and the Agentix Cloud platform.
