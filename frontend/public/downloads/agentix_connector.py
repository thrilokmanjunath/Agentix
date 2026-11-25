#!/usr/bin/env python3
"""
Agentix Universal Local LLM Connector Companion
===============================================
Enables local AI inference (Ollama, LM Studio, etc.) for both local Agentix installations
and the deployed Agentix Cloud web application (https://agentix-bay.vercel.app).

Zero external dependencies required (runs on standard Python 3.8+ on macOS, Windows, Linux).

Features:
  1. Local HTTP Loopback Gateway (http://127.0.0.1:11435) with Private Network Access (PNA)
     and strict CORS headers for seamless direct browser communication.
  2. Outbound Authenticated WebSocket Bridge connecting directly to Agentix Cloud,
     bypassing browser network boundaries, mixed-content checks, and CORS entirely.
  3. Automatic discovery of local Ollama (11434) and LM Studio (1234) models.
"""

import sys
import os
import time
import json
import socket
import ssl
import base64
import struct
import hashlib
import argparse
import threading
from urllib.parse import urlparse
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

VERSION = "1.2.0"
DEFAULT_PORT = 11435
DEFAULT_CLOUD_WS = "wss://agentix-api-lord.onrender.com/api/v1/platform/connector/ws"
OLLAMA_DEFAULT_URL = "http://127.0.0.1:11434"
LM_STUDIO_DEFAULT_URL = "http://127.0.0.1:1234"


def log(msg: str, tag: str = "INFO"):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [{tag}] {msg}", flush=True)


class LocalRuntimeDetector:
    """Scans and discovers models from local inference engines (Ollama, LM Studio)."""

    @staticmethod
    def query_ollama(base_url: str = OLLAMA_DEFAULT_URL) -> dict:
        url = base_url.rstrip("/") + "/api/tags"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AgentixConnector/1.0"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                    return {"online": True, "models": models}
        except Exception:
            pass
        return {"online": False, "models": []}

    @staticmethod
    def query_lm_studio(base_url: str = LM_STUDIO_DEFAULT_URL) -> dict:
        clean = base_url.rstrip("/")
        endpoints = [f"{clean}/v1/models", f"{clean}/models"] if not clean.endswith("/v1") else [f"{clean}/models"]
        for ep in endpoints:
            try:
                req = urllib.request.Request(ep, headers={"User-Agent": "AgentixConnector/1.0"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                        return {"online": True, "models": models}
            except Exception:
                continue
        return {"online": False, "models": []}

    @classmethod
    def discover_all(cls, ollama_url: str = OLLAMA_DEFAULT_URL, lm_studio_url: str = LM_STUDIO_DEFAULT_URL) -> dict:
        ollama_res = cls.query_ollama(ollama_url)
        lm_res = cls.query_lm_studio(lm_studio_url)
        all_models = []
        for m in ollama_res["models"]:
            all_models.append(f"ollama/{m}")
        for m in lm_res["models"]:
            all_models.append(f"lm_studio/{m}")

        return {
            "version": VERSION,
            "ollama_online": ollama_res["online"],
            "ollama_models": ollama_res["models"],
            "lm_studio_online": lm_res["online"],
            "lm_studio_models": lm_res["models"],
            "models": all_models,
        }

    @classmethod
    def execute_inference(cls, prompt: str, model: str, ollama_url: str = OLLAMA_DEFAULT_URL, lm_studio_url: str = LM_STUDIO_DEFAULT_URL) -> str:
        prov = "ollama"
        clean_model = model
        if "/" in model:
            prov, clean_model = model.split("/", 1)
        elif model.startswith("qwen") or model.startswith("llama") or model.startswith("mistral") or model.startswith("phi"):
            prov = "ollama"

        if prov == "ollama":
            url = ollama_url.rstrip("/") + "/api/generate"
            body = json.dumps({"model": clean_model, "prompt": prompt, "stream": False}).encode("utf-8")
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("response", "").strip()
        else:
            clean = lm_studio_url.rstrip("/")
            url = f"{clean}/chat/completions" if clean.endswith("/v1") else f"{clean}/v1/chat/completions"
            body = json.dumps({
                "model": clean_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
            }).encode("utf-8")
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
                return ""


class LocalLoopbackServer(BaseHTTPRequestHandler):
    """Local HTTP Server implementing PNA & CORS headers for browser-to-local communication."""

    ollama_url = OLLAMA_DEFAULT_URL
    lm_studio_url = LM_STUDIO_DEFAULT_URL
    auth_token = None

    def _set_cors_headers(self):
        origin = self.headers.get("Origin") or "*"
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Agentix-Token")
        # Chrome Private Network Access preflight compliance
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _check_auth(self) -> bool:
        if not self.auth_token:
            return True
        auth = self.headers.get("Authorization", "")
        token_hdr = self.headers.get("X-Agentix-Token", "")
        return token_hdr == self.auth_token or auth == f"Bearer {self.auth_token}"

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if not self._check_auth():
            self.send_response(403)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            err = json.dumps({"status": "error", "detail": "Unauthorized: valid token required."}).encode("utf-8")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers()
            self.wfile.write(err)
            return

        if self.path in ("/status", "/health", "/", "/api/status", "/models", "/api/models"):
            discovery = LocalRuntimeDetector.discover_all(self.ollama_url, self.lm_studio_url)
            models = []
            for m in discovery.get("ollama_models", []):
                models.append({"id": f"ollama/{m}", "name": m, "provider": "ollama"})
            for m in discovery.get("lm_studio_models", []):
                models.append({"id": f"lm_studio/{m}", "name": m, "provider": "lm_studio"})

            body = json.dumps({
                "status": "online",
                "connector_version": VERSION,
                "pna_enabled": True,
                "models": models,
                "total_models": len(models),
                **discovery
            }).encode("utf-8")
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self._set_cors_headers()
            self.end_headers()

    def do_POST(self):
        if not self._check_auth():
            self.send_response(403)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            err = json.dumps({"status": "error", "detail": "Unauthorized: valid token required."}).encode("utf-8")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers()
            self.wfile.write(err)
            return

        if self.path in ("/generate", "/api/generate", "/chat", "/api/chat"):
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length)
            try:
                payload = json.loads(raw_body.decode("utf-8"))
                prompt = payload.get("prompt") or payload.get("message") or ""
                model = payload.get("model") or "default"
                start = time.time()
                result = LocalRuntimeDetector.execute_inference(
                    prompt=prompt,
                    model=model,
                    ollama_url=self.ollama_url,
                    lm_studio_url=self.lm_studio_url
                )
                latency = round((time.time() - start) * 1000)
                resp_bytes = json.dumps({
                    "status": "success",
                    "text": result,
                    "latency_ms": latency,
                    "model": model
                }).encode("utf-8")
                self.send_response(200)
                self._set_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
            except Exception as e:
                err_bytes = json.dumps({"status": "error", "error": str(e)}).encode("utf-8")
                self.send_response(500)
                self._set_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(err_bytes)))
                self.end_headers()
                self.wfile.write(err_bytes)
        else:
            self.send_response(404)
            self._set_cors_headers()
            self.end_headers()

    def log_message(self, format, *args):
        # Silence routine access logs unless debugging
        pass


class SimpleWSClient:
    """Pure-Python standard-library WebSocket RFC 6455 client."""

    def __init__(self, url: str):
        self.url = url
        parsed = urlparse(url)
        self.scheme = parsed.scheme
        self.host = parsed.hostname
        self.port = parsed.port or (443 if self.scheme == "wss" else 80)
        self.path = parsed.path + ("?" + parsed.query if parsed.query else "")
        self.sock = None
        self.connected = False

    def connect(self):
        raw_sock = socket.create_connection((self.host, self.port), timeout=10)
        if self.scheme == "wss":
            ctx = ssl.create_default_context()
            self.sock = ctx.wrap_socket(raw_sock, server_hostname=self.host)
        else:
            self.sock = raw_sock

        key = base64.b64encode(os.urandom(16)).decode("utf-8")
        headers = [
            f"GET {self.path} HTTP/1.1",
            f"Host: {self.host}",
            "Upgrade: websocket",
            "Connection: Upgrade",
            f"Sec-WebSocket-Key: {key}",
            "Sec-WebSocket-Version: 13",
            "User-Agent: AgentixConnector/1.0",
            "\r\n",
        ]
        self.sock.sendall("\r\n".join(headers).encode("utf-8"))

        resp = b""
        while b"\r\n\r\n" not in resp:
            chunk = self.sock.recv(4096)
            if not chunk:
                break
            resp += chunk

        if b"101 Switching Protocols" not in resp:
            raise ConnectionError(f"WebSocket upgrade handshake failed: {resp[:200]}")
        self.connected = True

    def send_text(self, text: str):
        payload = text.encode("utf-8")
        length = len(payload)
        frame = bytearray([0x81])  # FIN + Text opcode

        # Client-to-server frames MUST be masked
        mask = os.urandom(4)
        if length <= 125:
            frame.append(0x80 | length)
        elif length <= 65535:
            frame.append(0x80 | 126)
            frame.extend(struct.pack("!H", length))
        else:
            frame.append(0x80 | 127)
            frame.extend(struct.pack("!Q", length))

        frame.extend(mask)
        masked_payload = bytearray(b ^ mask[i % 4] for i, b in enumerate(payload))
        frame.extend(masked_payload)
        self.sock.sendall(frame)

    def recv_text(self) -> str:
        b1, b2 = self.sock.recv(2)
        opcode = b1 & 0x0F
        if opcode == 0x08:  # Close
            self.connected = False
            return ""

        masked = bool(b2 & 0x80)
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack("!H", self.sock.recv(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self.sock.recv(8))[0]

        mask = self.sock.recv(4) if masked else None
        data = bytearray()
        while len(data) < length:
            chunk = self.sock.recv(min(4096, length - len(data)))
            if not chunk:
                break
            data.extend(chunk)

        if masked:
            return bytes(b ^ mask[i % 4] for i, b in enumerate(data)).decode("utf-8")
        return data.decode("utf-8")

    def close(self):
        self.connected = False
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass


def run_cloud_bridge(cloud_ws_url: str, token: str, ollama_url: str, lm_studio_url: str):
    """Maintains outbound authenticated WebSocket connection to Agentix Cloud."""
    ws_endpoint = f"{cloud_ws_url}?token={token}"
    while True:
        try:
            log(f"Connecting to Agentix Cloud bridge: {cloud_ws_url} ...", "BRIDGE")
            client = SimpleWSClient(ws_endpoint)
            client.connect()
            log("Connected to Agentix Cloud! Registering local inference capabilities...", "SUCCESS")

            # Send capability handshake
            discovery = LocalRuntimeDetector.discover_all(ollama_url, lm_studio_url)
            handshake = {
                "type": "handshake",
                "token": token,
                "version": VERSION,
                **discovery,
            }
            client.send_text(json.dumps(handshake))

            last_ping = time.time()
            while client.connected:
                # Periodic capability heartbeat every 25 seconds
                if time.time() - last_ping > 25:
                    latest = LocalRuntimeDetector.discover_all(ollama_url, lm_studio_url)
                    client.send_text(json.dumps({"type": "heartbeat", **latest}))
                    last_ping = time.time()

                # Set socket read timeout for heartbeat check
                client.sock.settimeout(2.0)
                try:
                    msg_text = client.recv_text()
                except socket.timeout:
                    continue
                except Exception:
                    break

                if not msg_text:
                    break

                try:
                    msg = json.loads(msg_text)
                    mtype = msg.get("type")
                    if mtype == "inference_request":
                        task_id = msg.get("task_id")
                        prompt = msg.get("prompt")
                        model = msg.get("model", "default")
                        log(f"Received inference task '{task_id}' for model '{model}'", "TASK")
                        try:
                            reply = LocalRuntimeDetector.execute_inference(
                                prompt=prompt,
                                model=model,
                                ollama_url=ollama_url,
                                lm_studio_url=lm_studio_url,
                            )
                            client.send_text(json.dumps({
                                "type": "task_result",
                                "task_id": task_id,
                                "text": reply,
                            }))
                            log(f"Completed task '{task_id}' ({len(reply)} chars)", "SUCCESS")
                        except Exception as ex:
                            log(f"Task '{task_id}' execution failed: {ex}", "ERROR")
                            client.send_text(json.dumps({
                                "type": "task_result",
                                "task_id": task_id,
                                "error": str(ex),
                            }))
                except json.JSONDecodeError:
                    pass

        except Exception as e:
            log(f"Cloud bridge connection error: {e}. Reconnecting in 5s...", "WARN")
            time.sleep(5)


def run_diagnostics(ollama_url: str, lm_studio_url: str, port: int) -> int:
    print("=" * 64)
    print(f"   AGENTIX CONNECTOR DIAGNOSTICS SUITE (v{VERSION})")
    print("=" * 64)
    
    # Check loopback port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        res = s.connect_ex(("127.0.0.1", port))
        if res == 0:
            print(f"[-] Loopback port {port}: IN USE (Another process listening)")
        else:
            print(f"[+] Loopback port {port}: AVAILABLE")

    # Check Ollama
    print(f"[*] Checking Ollama on {ollama_url}...")
    o_res = LocalRuntimeDetector.query_ollama(ollama_url)
    if o_res["online"]:
        print(f"[+] Ollama ONLINE: Found {len(o_res['models'])} model(s) -> {', '.join(o_res['models'])}")
    else:
        print(f"[-] Ollama OFFLINE or unreachable on {ollama_url}")

    # Check LM Studio
    print(f"[*] Checking LM Studio on {lm_studio_url}...")
    lm_res = LocalRuntimeDetector.query_lm_studio(lm_studio_url)
    if lm_res["online"]:
        print(f"[+] LM Studio ONLINE: Found {len(lm_res['models'])} model(s) -> {', '.join(lm_res['models'])}")
    else:
        print(f"[-] LM Studio OFFLINE or unreachable on {lm_studio_url}")

    success = o_res["online"] or lm_res["online"]
    print("-" * 64)
    if success:
        print("[SUCCESS] Local inference engine detected and ready for Agentix!")
        return 0
    else:
        print("[NOTICE] No local engines detected. Install Ollama (https://ollama.com) to enable local models.")
        return 1


def install_service(script_path: str, port: int, token: str):
    import platform
    system = platform.system()
    print(f"Installing Agentix Connector auto-start service for {system}...")
    
    if system == "Darwin":
        plist_dir = os.path.expanduser("~/Library/LaunchAgents")
        os.makedirs(plist_dir, exist_ok=True)
        plist_path = os.path.join(plist_dir, "com.agentix.connector.plist")
        token_arg = f"<string>--token</string><string>{token}</string>" if token else ""
        plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agentix.connector</string>
    <key>ProgramArguments</key>
    <array>
        <string>{sys.executable}</string>
        <string>{os.path.abspath(script_path)}</string>
        <string>--port</string>
        <string>{port}</string>
        {token_arg}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/agentix-connector.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/agentix-connector.err</string>
</dict>
</plist>"""
        with open(plist_path, "w") as f:
            f.write(plist_content)
        print(f"[+] macOS LaunchAgent installed at: {plist_path}")
        print(f"    Load with: launchctl load {plist_path}")
    elif system == "Windows":
        startup_dir = os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup")
        bat_path = os.path.join(startup_dir, "agentix-connector.bat")
        tok = f"--token {token}" if token else ""
        with open(bat_path, "w") as f:
            f.write(f'@echo off\nstart /b "" "{sys.executable}" "{os.path.abspath(script_path)}" --port {port} {tok}\n')
        print(f"[+] Windows Startup script installed at: {bat_path}")
    else:
        service_dir = os.path.expanduser("~/.config/systemd/user")
        os.makedirs(service_dir, exist_ok=True)
        service_path = os.path.join(service_dir, "agentix-connector.service")
        service_content = f"""[Unit]
Description=Agentix Local LLM Connector
After=network.target

[Service]
ExecStart={sys.executable} {os.path.abspath(script_path)} --port {port}
Restart=always

[Install]
WantedBy=default.target
"""
        with open(service_path, "w") as f:
            f.write(service_content)
        print(f"[+] Linux systemd service installed at: {service_path}")
        print("    Enable with: systemctl --user enable --now agentix-connector")


def main():
    parser = argparse.ArgumentParser(description="Agentix Local LLM Connector Companion")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Local HTTP loopback port (default: {DEFAULT_PORT})")
    parser.add_argument("--token", type=str, default="", help="Agentix Cloud pairing token")
    parser.add_argument("--auth-token", type=str, default="", help="Local loopback authorization token")
    parser.add_argument("--cloud-url", type=str, default=DEFAULT_CLOUD_WS, help="Agentix Cloud WebSocket URL")
    parser.add_argument("--ollama-url", type=str, default=OLLAMA_DEFAULT_URL, help="Ollama base URL")
    parser.add_argument("--lm-studio-url", type=str, default=LM_STUDIO_DEFAULT_URL, help="LM Studio base URL")
    parser.add_argument("--diagnose", action="store_true", help="Run diagnostic health checks on runtimes and exit")
    parser.add_argument("--install-service", action="store_true", help="Install background auto-start service for OS")
    args = parser.parse_args()

    if args.diagnose:
        sys.exit(run_diagnostics(args.ollama_url, args.lm_studio_url, args.port))

    if args.install_service:
        install_service(__file__, args.port, args.token)
        sys.exit(0)

    print("=" * 64)
    print("   AGENTIX UNIVERSAL LOCAL LLM CONNECTOR (v" + VERSION + ")")
    print("=" * 64)

    # Step 1: Scan local runtimes
    log("Scanning local hardware & inference engines...", "INIT")
    disc = LocalRuntimeDetector.discover_all(args.ollama_url, args.lm_studio_url)
    if disc["ollama_online"]:
        log(f"Ollama detected: Online ({len(disc['ollama_models'])} models available)", "FOUND")
        for m in disc["ollama_models"]:
            print(f"   -> ollama/{m}")
    else:
        log("Ollama: Offline or unreachable on 127.0.0.1:11434", "INFO")

    if disc["lm_studio_online"]:
        log(f"LM Studio detected: Online ({len(disc['lm_studio_models'])} models available)", "FOUND")
        for m in disc["lm_studio_models"]:
            print(f"   -> lm_studio/{m}")
    else:
        log("LM Studio: Offline or unreachable on 127.0.0.1:1234", "INFO")

    # Step 2: Start Local Loopback Server (Mode A)
    LocalLoopbackServer.ollama_url = args.ollama_url
    LocalLoopbackServer.lm_studio_url = args.lm_studio_url
    LocalLoopbackServer.auth_token = args.auth_token or None

    try:
        httpd = HTTPServer(("127.0.0.1", args.port), LocalLoopbackServer)
        http_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        http_thread.start()
        log(f"Local Loopback Gateway online: http://127.0.0.1:{args.port} (PNA Enabled)", "READY")
    except Exception as e:
        log(f"Failed to start local HTTP loopback on port {args.port}: {e}", "WARN")

    # Step 3: Start Outbound WebSocket Bridge (Mode B) if token present
    token = args.token or os.environ.get("AGENTIX_PAIRING_TOKEN")
    if token:
        log(f"Using pairing token for Agentix Cloud bridge: {token[:12]}...", "AUTH")
        bridge_thread = threading.Thread(
            target=run_cloud_bridge,
            args=(args.cloud_url, token, args.ollama_url, args.lm_studio_url),
            daemon=True,
        )
        bridge_thread.start()
    else:
        log("No --token provided. Running in local loopback mode.", "INFO")
        log("To connect with deployed Agentix Cloud, provide --token from Settings > AI Providers.", "TIP")

    print("\n[ACTIVE] Agentix Local Connector is running. Press Ctrl+C to terminate.\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down Agentix Local Connector. Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    main()
