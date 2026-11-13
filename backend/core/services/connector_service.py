import asyncio
import json
import logging
import os
import time
import uuid
import hmac
import hashlib
from typing import Dict, Any, Optional, List
from fastapi import WebSocket

logger = logging.getLogger("agentix_v2")

SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or "super-secret-agentix-key-2026"
TOKEN_EXPIRY_SECONDS = 3600  # 1 hour pairing window


def generate_pairing_token(user_id: str) -> str:
    """Generate a tamper-proof, short-lived pairing token for the user's local connector."""
    exp = int(time.time()) + TOKEN_EXPIRY_SECONDS
    payload = f"{user_id}:{exp}"
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"agx_{payload}:{signature}"


def verify_pairing_token(token: str) -> Optional[str]:
    """Verify pairing token validity and return the authenticated user_id."""
    if not token or not token.startswith("agx_"):
        return None
    raw = token[4:]
    parts = raw.split(":")
    if len(parts) != 3:
        return None
    user_id, exp_str, sig = parts
    try:
        exp = int(exp_str)
        if time.time() > exp:
            return None
    except ValueError:
        return None

    payload = f"{user_id}:{exp_str}"
    expected_sig = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if hmac.compare_digest(sig, expected_sig):
        return user_id
    return None


class ConnectorManager:
    """Manages active local connector sessions, capabilities, and bidirectional inference routing."""
    def __init__(self):
        self._active_connections: Dict[str, WebSocket] = {}
        self._connector_meta: Dict[str, Dict[str, Any]] = {}
        self._pending_tasks: Dict[str, asyncio.Future] = {}

    def register(self, user_id: str, ws: WebSocket, meta: Dict[str, Any]):
        self._active_connections[user_id] = ws
        self._connector_meta[user_id] = {
            **meta,
            "connected_at": time.time(),
            "last_heartbeat": time.time(),
            "models": meta.get("models", []),
            "version": meta.get("version", "1.0.0"),
        }
        logger.info(f"Local connector registered for user '{user_id}' with {len(meta.get('models', []))} models.")

    def update_heartbeat(self, user_id: str, meta: Optional[Dict[str, Any]] = None):
        if user_id in self._connector_meta:
            self._connector_meta[user_id]["last_heartbeat"] = time.time()
            if meta:
                self._connector_meta[user_id].update(meta)

    def unregister(self, user_id: str):
        self._active_connections.pop(user_id, None)
        self._connector_meta.pop(user_id, None)
        logger.info(f"Local connector unregistered for user '{user_id}'.")

    def is_connected(self, user_id: str) -> bool:
        if user_id not in self._active_connections or user_id not in self._connector_meta:
            return False
        # Consider disconnected if no heartbeat for 60 seconds
        if time.time() - self._connector_meta[user_id].get("last_heartbeat", 0) > 60:
            return False
        return True

    def get_status(self, user_id: str) -> Dict[str, Any]:
        connected = self.is_connected(user_id)
        if not connected:
            return {
                "connected": False,
                "status": "offline",
                "message": "Local connector is not active for this user session.",
                "models": [],
            }
        meta = self._connector_meta.get(user_id, {})
        return {
            "connected": True,
            "status": "connected",
            "message": "Local connector online & ready for inference.",
            "version": meta.get("version", "1.0.0"),
            "models": meta.get("models", []),
            "ollama_online": meta.get("ollama_online", False),
            "lm_studio_online": meta.get("lm_studio_online", False),
            "uptime_seconds": round(time.time() - meta.get("connected_at", time.time())),
        }

    async def execute_local_inference(
        self,
        user_id: str,
        prompt: str,
        model: Optional[str] = None,
        timeout: int = 45
    ) -> str:
        """Route an inference task through the authenticated outbound WebSocket bridge to the user's laptop."""
        if not self.is_connected(user_id):
            raise RuntimeError("Local connector is offline. Launch the Agentix Local Connector on your device.")

        ws = self._active_connections[user_id]
        task_id = f"task_{uuid.uuid4().hex[:12]}"
        loop = asyncio.get_running_loop()
        future: asyncio.Future = loop.create_future()
        self._pending_tasks[task_id] = future

        try:
            req_payload = {
                "type": "inference_request",
                "task_id": task_id,
                "model": model or "default",
                "prompt": prompt,
                "timestamp": time.time(),
            }
            await ws.send_text(json.dumps(req_payload))
            # Wait for connector response
            result_json_str = await asyncio.wait_for(future, timeout=timeout)
            result = json.loads(result_json_str)
            if result.get("error"):
                raise RuntimeError(f"Local connector execution failed: {result['error']}")
            return result.get("text", "")
        finally:
            self._pending_tasks.pop(task_id, None)

    def resolve_task(self, task_id: str, response_payload: str):
        future = self._pending_tasks.get(task_id)
        if future and not future.done():
            future.set_result(response_payload)


connector_manager = ConnectorManager()
