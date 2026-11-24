# Agentix Desktop Ecosystem — Code Signing & Notarization Guide

This document establishes the official enterprise release engineering standards for signing, notarizing, and distributing Agentix Native Desktop binaries across macOS and Windows.

---

## 1. macOS Code Signing & Apple Notarization

macOS requires all distributed software to be signed with an Apple Developer ID Application certificate and notarized by Apple's automated notary service to bypass Gatekeeper without user warnings.

### 1.1 Prerequisites
- Apple Developer Program Membership ($99/year).
- **Developer ID Application Certificate** installed in the macOS Keychain.
- App-Specific Password generated at [appleid.apple.com](https://appleid.apple.com).

### 1.2 Verification of Local Signing Identity
```bash
security find-identity -p codesigning -v
# Output should list: "Developer ID Application: Your Name / Org (TEAM_ID)"
```

### 1.3 Entitlements & Hardened Runtime
The desktop bundle uses `packaging/macos/entitlements.plist` to permit the Python runtime, PyInstaller C-extensions, and WebKit to function under Hardened Runtime:
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.network.client`
- `com.apple.security.network.server`

### 1.4 Manual Signing Command
```bash
codesign --deep --force --options runtime \
  --entitlements packaging/macos/entitlements.plist \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  "desktop/src-tauri/target/release/bundle/macos/Agentix.app"
```

### 1.5 Notarization via `notarytool`
Store credentials in your keychain profile:
```bash
xcrun notarytool store-credentials "AGENTIX_NOTARY" \
  --apple-id "developer@agentix.ai" \
  --team-id "TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

Submit the DMG bundle for notarization:
```bash
xcrun notarytool submit "Agentix_1.0.0_aarch64.dmg" \
  --keychain-profile "AGENTIX_NOTARY" \
  --wait
```

Staple the notarization ticket to the DMG:
```bash
xcrun stapler staple "Agentix_1.0.0_aarch64.dmg"
```

Verify Gatekeeper acceptance:
```bash
spctl --assess --type open --context context:primary-signature -v "Agentix_1.0.0_aarch64.dmg"
```

---

## 2. Windows Authenticode Signing

Windows Defender SmartScreen evaluates binary signatures. Unsigned binaries trigger an untrusted application prompt ("Windows protected your PC").

### 2.1 Certificate Options
- **EV (Extended Validation) Code Signing Certificate**: Instant SmartScreen reputation, hardware token or cloud HSM required (Azure Key Vault / DigiCert ONE).
- **Standard OV Code Signing Certificate**: Builds SmartScreen reputation over time as download volume increases.

### 2.2 Signing with `signtool.exe`
```powershell
signtool.exe sign `
  /tr http://timestamp.digicert.com `
  /td sha256 `
  /fd sha256 `
  /a `
  "desktop\src-tauri\target\release\bundle\msi\Agentix_1.0.0_x64_en-US.msi"
```

### 2.3 Verification
```powershell
signtool.exe verify /pa /v "Agentix_1.0.0_x64_en-US.msi"
```

---

## 3. GitHub Actions Automated Signing Configuration

The CI/CD pipeline (`.github/workflows/build-desktop.yml`) supports automated signing when these repository secrets are configured:

| Secret Name | Platform | Description |
|---|---|---|
| `APPLE_CERTIFICATE` | macOS | Base64-encoded `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | macOS | Password for the `.p12` certificate |
| `APPLE_SIGNING_IDENTITY` | macOS | Identity name (e.g. `Developer ID Application: ...`) |
| `APPLE_ID` | macOS | Apple ID email address |
| `APPLE_PASSWORD` | macOS | App-specific password for notarytool |
| `APPLE_TEAM_ID` | macOS | 10-character Apple Developer Team ID |
| `WINDOWS_CERTIFICATE` | Windows | Base64-encoded `.pfx` certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | Windows | Password for the `.pfx` certificate |
