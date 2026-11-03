import json
import time
from collections import defaultdict
from typing import Dict, List

SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"x-xss-protection", b"1; mode=block"),
    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    (b"content-security-policy", b"default-src 'self'"),
]


class SecurityMiddleware:
    """Pure ASGI middleware (not BaseHTTPMiddleware) to avoid the documented
    Starlette hang that occurs when multiple BaseHTTPMiddleware subclasses are
    stacked on the same app — see core/middleware/profiling.py for the same fix."""

    def __init__(self, app, rate_limit: int = 200):
        self.app = app
        self.rate_limit = rate_limit
        self.window_seconds = 60
        # In-memory sliding window rate limiter: client_ip -> list of timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def _get_client_ip(self, scope) -> str:
        client = scope.get("client")
        if client:
            return client[0]
        headers = dict(scope.get("headers") or [])
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            return forwarded.decode().split(",")[0].strip()
        return "127.0.0.1"

    def _is_rate_limited(self, ip: str, path: str) -> bool:
        now = time.time()
        
        # Periodic cleanup of expired entries (every 60s)
        if now - self._last_cleanup > 60:
            stale_cutoff = now - self.window_seconds
            for key in list(self._requests.keys()):
                self._requests[key] = [ts for ts in self._requests[key] if ts > stale_cutoff]
                if not self._requests[key]:
                    del self._requests[key]
            self._last_cleanup = now

        # Stricter rate limit on authentication routes to prevent brute-force
        limit = 30 if "/auth/" in path else self.rate_limit

        cutoff = now - self.window_seconds
        timestamps = [ts for ts in self._requests[ip] if ts > cutoff]
        self._requests[ip] = timestamps

        if len(timestamps) >= limit:
            return True

        self._requests[ip].append(now)
        return False

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 1. Request Size Limits (100 MB max for file uploads)
        headers = dict(scope.get("headers") or [])
        content_length = headers.get(b"content-length")
        if content_length and int(content_length) > 100 * 1024 * 1024:
            body = json.dumps({"detail": "Payload Too Large"}).encode()
            await send({
                "type": "http.response.start",
                "status": 413,
                "headers": [(b"content-type", b"application/json")],
            })
            await send({"type": "http.response.body", "body": body})
            return

        # 2. Rate Limiting Enforcement (Sliding Window per IP)
        client_ip = self._get_client_ip(scope)
        path = scope.get("path", "")
        if self._is_rate_limited(client_ip, path):
            body = json.dumps({
                "detail": "Too Many Requests. Rate limit exceeded. Please retry later."
            }).encode()
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", b"60")
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + SECURITY_HEADERS
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
