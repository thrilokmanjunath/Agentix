"""
Unit and Integration Tests for Agentix Desktop Sidecar & Connector
===================================================================
Tests dynamic port binding, cryptographic token validation,
machine-readable handshake, remote shutdown, and connector discovery.
"""

import os
import sys
import time
import socket
import tempfile
import requests
import subprocess
import pytest
from pathlib import Path

# Add backend directory to path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "connector"))

from desktop_entry import find_free_port, get_default_data_dir


def test_find_free_port():
    """Verify that find_free_port returns an available TCP port."""
    port = find_free_port()
    assert isinstance(port, int)
    assert 1024 < port < 65535
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        res = s.connect_ex(("127.0.0.1", port))
        assert res != 0, f"Port {port} should not be in use yet"


def test_default_data_dir():
    """Verify standard OS application data directory resolution."""
    path = get_default_data_dir()
    assert isinstance(path, Path)
    assert "Agentix" in str(path)


def test_desktop_sidecar_lifecycle():
    """Integration test: Launch desktop_entry.py, test handshake, auth barrier, and shutdown."""
    python_bin = sys.executable
    script_path = str(REPO_ROOT / "backend" / "desktop_entry.py")
    test_token = "pytest_secure_token_998877"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        proc = subprocess.Popen(
            [python_bin, script_path, "--port", "0", "--token", test_token, "--data-dir", tmpdir],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        port = None
        token = None
        try:
            # 1. Parse Handshake
            for line in proc.stdout:
                if "[AGENTIX_BACKEND_READY]" in line:
                    parts = dict(kv.split("=", 1) for kv in line.strip().split() if "=" in kv)
                    port = int(parts.get("PORT", "0"))
                    token = parts.get("TOKEN", "")
                    break

            assert port is not None and port > 0, "Failed to capture port from handshake"
            assert token == test_token, f"Expected {test_token}, got {token}"

            # 2. Public health probe (no token needed)
            r_health = requests.get(f"http://127.0.0.1:{port}/health", timeout=5)
            assert r_health.status_code == 200
            assert r_health.json()["status"] == "success"

            # 3. Protected endpoint without token -> 403 Forbidden
            r_unauth = requests.get(f"http://127.0.0.1:{port}/api/v1/dataset/list", timeout=5)
            assert r_unauth.status_code == 403
            assert "Unauthorized" in r_unauth.json()["detail"]

            # 4. Protected endpoint with token -> passes desktop security barrier
            r_auth = requests.get(
                f"http://127.0.0.1:{port}/api/v1/dataset/list",
                headers={"X-Agentix-Token": token},
                timeout=5
            )
            assert r_auth.status_code != 403, "Desktop session token should pass security barrier"

            # 5. Remote shutdown
            r_shutdown = requests.post(
                f"http://127.0.0.1:{port}/api/v1/system/shutdown",
                headers={"X-Agentix-Token": token},
                timeout=5
            )
            assert r_shutdown.status_code == 200
            assert r_shutdown.json()["status"] == "ok"

        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


def test_connector_diagnostics():
    """Verify that agentix_connector diagnostics function executes cleanly."""
    from agentix_connector import run_diagnostics
    # Run against a non-colliding port
    code = run_diagnostics("http://127.0.0.1:11434", "http://127.0.0.1:1234", 19999)
    # Return code is 0 if any engine is found, or 1 if offline, but must not crash
    assert code in (0, 1)
