# Agentix Universal Local LLM & Hardware Acceleration Setup Guide

This guide provides end-to-end instructions for configuring local Large Language Models (LLMs) to power the **Agentix AI Intelligence Platform**, whether you are accessing the platform via the public cloud deployment ([https://agentix-bay.vercel.app](https://agentix-bay.vercel.app)) or running it locally.

---

## 1. Architecture Overview: How Local AI Works on Agentix

Agentix supports two distinct operational modes for local inference:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              LOCAL MODE                                │
│   Browser (localhost:3000) ──> FastAPI (localhost:8000) ──> Ollama    │
│                                                                        │
│                              CLOUD MODE                                │
│   Browser (agentix-bay.vercel.app)                                     │
│          │                                                             │
│          ▼ (HTTPS)                                                     │
│   FastAPI Cloud Backend (Render)                                       │
│          │                                                             │
│          ▼ (Encrypted Outbound WebSocket Tunnel)                       │
│   Agentix Local Connector (Runs on your laptop via standard Python)   │
│          │                                                             │
│          ▼ (Loopback 127.0.0.1)                                        │
│   Ollama (11434) / LM Studio (1234)                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Why the Connector Companion is Required for Cloud Web Apps
Modern browsers enforce **Private Network Access (PNA)** and **Mixed-Content Security**. When you visit a secure cloud application (`https://...`), your browser prohibits JavaScript from directly communicating with your computer's local loopback addresses (`http://127.0.0.1:11434`) unless specific PNA preflight headers (`Access-Control-Allow-Private-Network: true`) and strict CORS responses are delivered.

Furthermore, standard local daemons (like Ollama) do not support authenticated remote ingress. The **Agentix Local Connector Companion** solves this with zero external dependencies:
1. **Zero router/firewall configuration**: Initiates an outbound WebSocket tunnel to your session.
2. **Air-gapped data isolation**: Datasets and prompt tokens are processed entirely in your computer's RAM/VRAM. No model weights or generated tokens are stored in the cloud.
3. **PNA compliance**: Serves a local loopback gateway with native Private Network Access headers.

---

## 2. Runtime Installation

### Option A: Ollama (Recommended)

Ollama is a high-performance open-source inference engine supporting Apple Silicon Metal, NVIDIA CUDA, and CPU acceleration.

#### macOS
```bash
# Using Homebrew:
brew install ollama

# Or download the macOS DMG:
# https://ollama.com/download/Ollama-darwin.zip
```
Start Ollama:
```bash
ollama serve
```

#### Windows
1. Download and run the official Windows installer from [ollama.com/download/windows](https://ollama.com/download/windows).
2. The Ollama tray icon will start automatically and listen on `http://127.0.0.1:11434`.

#### Linux (Ubuntu/Debian/RHEL/CentOS)
```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
```

---

### Option B: LM Studio (Alternative)

LM Studio provides an interactive GUI for downloading GGUF models from Hugging Face with an OpenAI-compatible local API server.

1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai/) (macOS, Windows, Linux).
2. Search and download your desired GGUF model (e.g. `Qwen2.5-3B-Instruct-GGUF` or `Llama-3.2-3B-Instruct-GGUF`).
3. Click the **Developer / Local Server** tab (the `<->` icon on the left bar).
4. Select your loaded model and click **Start Server**.
5. Ensure the server port is set to `1234` (default). LM Studio will serve OpenAI-compatible endpoints at `http://127.0.0.1:1234/v1`.

---

## 3. Recommended Models by Hardware Capacity

Choose a model suited to your device's unified memory / system RAM:

| System Memory | Recommended Models | Parameter Size | Typical Latency | Quantization |
| :--- | :--- | :--- | :--- | :--- |
| **8 GB RAM** | `qwen2.5:3b`, `llama3.2:3b`, `phi3.5:3.8b` | 3B | ~80–250 ms/token | Q4_K_M |
| **16 GB RAM** | `qwen2.5:7b`, `llama3.1:8b`, `mistral:7b` | 7B – 8B | ~40–120 ms/token | Q4_K_M |
| **32 GB+ RAM** | `qwen2.5:14b`, `command-r:35b` | 14B – 35B | ~60–180 ms/token | Q4_K_M / Q8_0 |
| **Workstation / GPU** | `qwen2.5:32b`, `llama3.3:70b` | 32B – 70B | ~30–90 ms/token | Q4_K_M |

To pull your first model with Ollama:
```bash
ollama pull qwen2.5:3b
```

Verify your model is working:
```bash
ollama run qwen2.5:3b "Hello from my terminal!"
```

---

## 4. Connecting to the Deployed Agentix Web Application

When using **[https://agentix-bay.vercel.app](https://agentix-bay.vercel.app)**:

1. Navigate to **Institutional Settings** > **AI Inference Engine** (`/settings?tab=llm`).
2. Scroll to the **Agentix Local Connector Companion** card.
3. Click **Generate Secure Pairing Command**.
4. Copy and paste the generated command into your terminal:

**macOS / Linux:**
```bash
curl -sSL https://agentix-bay.vercel.app/connector.py | python3 - --token <YOUR_PAIRING_TOKEN>
```

**Windows PowerShell:**
```powershell
irm https://agentix-bay.vercel.app/connector.py | python - --token <YOUR_PAIRING_TOKEN>
```

5. The terminal will output:
```
================================================================
   AGENTIX UNIVERSAL LOCAL LLM CONNECTOR (v1.0.0)
================================================================
[08:15:07] [INIT] Scanning local hardware & inference engines...
[08:15:07] [FOUND] Ollama detected: Online (2 models available)
   -> ollama/qwen2.5:3b
[08:15:07] [READY] Local Loopback Gateway online: http://127.0.0.1:11435 (PNA Enabled)
[08:15:07] [AUTH] Using pairing token for Agentix Cloud bridge: agx_...
[08:15:07] [SUCCESS] Connected to Agentix Cloud! Registering local inference capabilities...
```

6. Return to the browser: the connector status badge will turn green (**Bridge Online**).
7. Select **Agentix Local Connector** as your Provider Source, select your local model, and click **Use Model**.
8. Test real-time execution in the **Live Interactive Inference Test** card!

---

## 5. Connecting when Running Agentix Locally

If you clone and run Agentix on your machine (`localhost:3000` + `localhost:8000`):

1. Ensure Ollama is running (`ollama serve`).
2. Open `http://localhost:3000/settings?tab=llm`.
3. Agentix automatically queries `http://127.0.0.1:11434/api/tags` on startup.
4. Select **Ollama (Local Engine)** from the provider dropdown.
5. All local models appear instantly in the model dropdown.
6. Click **Use Model** to route all agent reasoning, AutoML insights, and chat tasks through local hardware.

---

## 6. Troubleshooting & Diagnostics

### Q: "Failed to connect to 127.0.0.1:11434"
- Verify that Ollama is actually running by opening `http://127.0.0.1:11434` in your browser. You should see `Ollama is running`.
- If on Linux, check daemon status: `sudo systemctl status ollama`.

### Q: "LM Studio: Connection Refused on port 1234"
- Open LM Studio, navigate to the **Developer / Local Server** tab, and verify that the toggle is set to **Start Server**.
- Ensure CORS is enabled in LM Studio server settings.

### Q: "Chrome shows Private Network Access warning"
- The Agentix Local Connector (`connector.py`) automatically returns the required `Access-Control-Allow-Private-Network: true` preflight header.
- Ensure you run `python3 connector.py` on your computer.

### Q: "Can I use CPU-only systems without a dedicated GPU?"
- Yes. Both Ollama and llama.cpp/LM Studio compile high-efficiency AVX2/AVX-512 CPU kernels. Small models like `qwen2.5:3b` run comfortably at 25–40 tokens/second on modern CPUs without any GPU.

### Q: "Are prompts or datasets transmitted to third-party clouds?"
- When **Execution Policy** is set to **Local Only (Air-Gapped)**, Agentix strictly enforces a software firewall blocking all external API calls. All reasoning is performed on your own device.
