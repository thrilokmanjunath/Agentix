#!/usr/bin/env python3
"""
Agentix Desktop Sidecar Entrypoint
==================================
Production-grade backend launcher for the Agentix Desktop application.
Features:
  - Ephemeral or static port binding strictly on 127.0.0.1
  - Per-session cryptographic token generation and validation
  - Isolated OS user application data directory management
  - Machine-readable startup handshake logging for Tauri IPC
  - Graceful shutdown handling on SIGTERM, SIGINT, or HTTP POST
"""

import sys
import os
import socket
import argparse
import secrets
import signal
import asyncio
from pathlib import Path

# Add backend directory to path for both normal execution and PyInstaller bundles
if hasattr(sys, "_MEIPASS"):
    sys.path.insert(0, sys._MEIPASS)
else:
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))


def get_default_data_dir() -> Path:
    """Returns platform-standard application data directory for Agentix."""
    app_name = "Agentix"
    home = Path.home()
    if sys.platform == "darwin":
        path = home / "Library" / "Application Support" / app_name
    elif sys.platform == "win32":
        app_data = os.getenv("APPDATA")
        path = Path(app_data) / app_name if app_data else home / "AppData" / "Roaming" / app_name
    else:
        path = home / ".local" / "share" / app_name
    return path


def find_free_port() -> int:
    """Finds an available ephemeral port on 127.0.0.1."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        return s.getsockname()[1]


def parse_arguments():
    parser = argparse.ArgumentParser(description="Agentix Desktop Backend Sidecar")
    parser.add_argument("--port", type=int, default=0, help="Port to bind to (0 = dynamic free port)")
    parser.add_argument("--token", type=str, default="", help="Per-session authorization token")
    parser.add_argument("--data-dir", type=str, default="", help="Directory for local database and storage")
    parser.add_argument("--cors-origin", type=str, default="", help="Additional CORS origins to permit")
    return parser.parse_args()


def main():
    args = parse_arguments()

    # 1. Determine Port & Session Token
    port = args.port if args.port > 0 else find_free_port()
    session_token = args.token.strip() or secrets.token_hex(24)

    # 2. Determine and Prepare Application Data Directory
    data_dir = Path(args.data_dir).resolve() if args.data_dir else get_default_data_dir()
    db_path = data_dir / "agentix.db"
    parquet_dir = data_dir / "data" / "temp"
    models_dir = data_dir / "models"
    logs_dir = data_dir / "logs"

    for d in [data_dir, parquet_dir, models_dir, logs_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # 3. Configure Environment before loading FastAPI and SQLAlchemy
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    os.environ["AGENTIX_DATA_DIR"] = str(data_dir)
    os.environ["AGENTIX_SESSION_TOKEN"] = session_token
    os.environ["AGENTIX_DESKTOP_MODE"] = "true"
    os.environ["PORT"] = str(port)
    os.environ["ALLOWED_ORIGINS"] = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "tauri://localhost,http://tauri.localhost,http://localhost:1420,http://127.0.0.1:1420"
        + (f",{args.cors_origin}" if args.cors_origin else "")
    )

    # 4. Import Core Application
    import uvicorn
    from fastapi import Request, Response
    from fastapi.responses import JSONResponse
    from core.api.main import app

    # 5. Attach Desktop Security Token Verification Middleware
    PUBLIC_PATHS = {
        "/health",
        "/metrics",
        "/docs",
        "/redoc",
        "/api/v1/openapi.json",
        "/api/v1/system/health",
        "/api/v1/system/liveness",
        "/api/v1/system/readiness",
    }

    @app.middleware("http")
    async def verify_desktop_token(request: Request, call_next):
        path = request.url.path
        if path in PUBLIC_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        # Token check via header or query parameter
        auth_header = request.headers.get("x-agentix-token")
        query_token = request.query_params.get("token")
        incoming_token = auth_header or query_token

        if not incoming_token or incoming_token != session_token:
            return JSONResponse(
                status_code=403,
                content={
                    "status": "error",
                    "detail": "Unauthorized local client: valid X-Agentix-Token header required.",
                },
            )
        return await call_next(request)

    # 6. Add Graceful Remote Shutdown Endpoint
    shutdown_event = asyncio.Event()

    @app.post("/api/v1/system/shutdown")
    async def trigger_shutdown(request: Request):
        shutdown_event.set()
        asyncio.get_event_loop().call_later(0.1, lambda: setattr(server, "should_exit", True))
        return {"status": "ok", "message": "Agentix desktop backend is shutting down."}

    # 8. Machine-Readable Handshake for Tauri Desktop Shell (Emitted when server is live)
    @app.on_event("startup")
    async def on_startup():
        handshake_msg = (
            f"[AGENTIX_BACKEND_READY] "
            f"PORT={port} "
            f"TOKEN={session_token} "
            f"DATA_DIR={data_dir} "
            f"PID={os.getpid()}"
        )
        print(handshake_msg, flush=True)

    # 9. Configure Uvicorn Server
    config = uvicorn.Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="info",
        access_log=False,
    )
    server = uvicorn.Server(config)

    # 10. Signal Handlers
    def handle_signal(sig, frame):
        print(f"\n[AGENTIX_BACKEND] Received signal {sig}, terminating gracefully...", flush=True)
        server.should_exit = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    # 11. Run Server
    try:
        server.run()
    except Exception as e:
        print(f"[AGENTIX_BACKEND_ERROR] Server crash: {e}", file=sys.stderr, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
