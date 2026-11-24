# Agentix Desktop — Release Engineering Guide

This guide describes the end-to-end release lifecycle for shipping production versions of Agentix Native Desktop.

---

## 1. Versioning Standard

Agentix follows [Semantic Versioning 2.0.0](https://semver.org/):
- **Major (`X.0.0`)**: Breaking architectural changes, protocol alterations.
- **Minor (`1.X.0`)**: New platform targets, new AutoML algorithms, new connector capabilities.
- **Patch (`1.0.X`)**: Bug fixes, security patches, packaging optimizations.

---

## 2. Release Checklist

1. **Verify Unit & Integration Tests**:
   ```bash
   backend/.venv/bin/pytest backend/tests/test_desktop_sidecar.py -v
   npm --prefix frontend run build
   cd desktop/src-tauri && cargo check
   ```

2. **Update Version Numbers Synchronously**:
   - `desktop/src-tauri/tauri.conf.json`: `"version": "X.Y.Z"`
   - `desktop/src-tauri/Cargo.toml`: `version = "X.Y.Z"`
   - `desktop/package.json`: `"version": "X.Y.Z"`
   - `connector/agentix_connector.py`: `VERSION = "X.Y.Z"`

3. **Commit & Tag Release**:
   ```bash
   git add .
   git commit -m "chore(release): prepare desktop v1.0.0"
   git tag -a v1.0.0 -m "Agentix Desktop Ecosystem Release 1.0.0"
   git push origin main --tags
   ```

4. **CI/CD Build Automation**:
   - Pushing tag `v*` triggers the `.github/workflows/build-desktop.yml` workflow.
   - GitHub Actions executes the build matrix (`macos-latest`, `macos-13`, `windows-latest`).
   - Binaries are built, signed, checksummed, and collected into a draft GitHub Release.

5. **Release Notes Template**:
   - Provide summary of enhancements.
   - List hardware platforms tested.
   - Publish `SHA256SUMS.txt` hashes.
   - Publish draft to public.
