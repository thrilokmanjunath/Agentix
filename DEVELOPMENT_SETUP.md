# Agentix Desktop — Development Environment Setup

This guide walks through configuring a local development environment for building, debugging, and testing both the **Python FastAPI sidecar** and the **Tauri v2 native desktop shell**.

---

## 1. Prerequisites & Toolchain Installation

Ensure the following runtimes and compilers are installed on your workstation:

### Node.js & Package Manager
- **Node.js**: v22.x or v20.x (Node 22+ recommended).
- **npm**: v10+ or v11+.

### Python Environment
- **Python**: 3.12 (or 3.11).
- Virtual environment manager (`venv` or `uv`).

### Rust & Cargo
- **Rust**: 1.78+ (tested on `1.100.0`).
- Installation:
  - macOS via Homebrew: `brew install rust`
  - macOS / Linux / Windows via rustup: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

---

## 2. Repository Initialization

Clone and checkout the development branch:
```bash
git clone https://github.com/thrilokmanjunath/Agentix.git
cd agentix
git checkout feature/native-desktop
```

---

## 3. Backend Setup & PyInstaller Sidecar Preparation

1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   pip install pyinstaller
   cd ..
   ```

2. Test run the desktop entrypoint directly:
   ```bash
   python backend/desktop_entry.py --port 0 --token mydevtoken
   # Should output: [AGENTIX_BACKEND_READY] PORT=... TOKEN=mydevtoken ...
   ```

3. Build the native PyInstaller sidecar binary:
   ```bash
   chmod +x packaging/pyinstaller/build_backend.sh
   ./packaging/pyinstaller/build_backend.sh
   # On Windows: packaging\pyinstaller\build_backend.bat
   ```
   This generates `desktop/src-tauri/bin/agentix-backend-<target-triple>`.

---

## 4. Frontend Web Studio Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run Next.js in development mode:
   ```bash
   npm run dev
   # Server starts at http://localhost:3000
   ```

---

## 5. Running the Native Desktop Shell in Development Mode

In a new terminal window:
```bash
cd desktop
npm install
npm run tauri dev
```
Tauri launches the native desktop window, connects to the Next.js dev server on `http://localhost:3000`, spawns the Python backend sidecar, and establishes IPC communication.
