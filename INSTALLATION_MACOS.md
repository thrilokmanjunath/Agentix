# Agentix Desktop — macOS Installation Guide

This guide provides instructions for installing and running **Agentix Native Desktop** on macOS.

---

## 1. System Requirements

- **Operating System**: macOS Big Sur (11.0) or later (macOS Sequoia 15.x recommended).
- **Architecture**:
  - **Apple Silicon (M1, M2, M3, M4)**: Download `Agentix_1.0.0_aarch64.dmg`.
  - **Intel Core (x86_64)**: Download `Agentix_1.0.0_x64.dmg`.
- **RAM**: 8 GB minimum (16 GB+ recommended for local LLM inference).
- **Storage**: ~500 MB free disk space for the application and sidecar dependencies.

---

## 2. Standard Installation

1. Download the appropriate `.dmg` disk image for your Mac architecture from [GitHub Releases](https://github.com/agentix-ai/agentix/releases).
2. Double-click the downloaded `.dmg` file to mount it.
3. Drag the **Agentix** application icon into your **Applications** folder.
4. Eject the disk image and launch Agentix from Launchpad, Spotlight, or the Applications folder.

---

## 3. Apple Gatekeeper & Notarization Handling

Agentix releases are signed and notarized by Apple. If you are running an ad-hoc or development build that has not been notarized with your personal Apple Developer ID:

### Option A: Standard macOS Prompt
1. When double-clicking Agentix, macOS may display: *"Agentix can't be opened because Apple cannot check it for malicious software."*
2. Open **System Settings** > **Privacy & Security**.
3. Scroll down to the **Security** section where you will see: *"Agentix was blocked from use because it is not from an identified developer."*
4. Click **Open Anyway** and enter your administrator password when prompted.

### Option B: Terminal Command (One-time Quarantine Removal)
If preferred, you can strip the Apple Quarantine attribute via Terminal:
```bash
xattr -d com.apple.quarantine /Applications/Agentix.app
```

---

## 4. Local AI Inference Setup (Optional but Recommended)

Agentix Desktop automatically connects to local LLMs via Ollama:
1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull your desired models:
   ```bash
   ollama pull qwen2.5:3b
   ollama pull llama3.2:3b
   ```
3. Open Agentix Desktop. Navigate to **Settings** > **Desktop Ecosystem** to verify that Ollama is detected on `http://127.0.0.1:11434`.

---

## 5. Storage Directory

Agentix stores all local databases, Parquet files, and logs inside your user Application Support directory:
```
~/Library/Application Support/Agentix/
├── agentix.db       # SQLite local relational database
├── data/temp/       # Cached Parquet tabular lakehouse
├── models/          # Serialized scikit-learn AutoML models
└── logs/            # Execution telemetry and logs
```
You can quickly open this folder at any time by clicking **Open Data Folder** inside the **Desktop Ecosystem** settings panel.
