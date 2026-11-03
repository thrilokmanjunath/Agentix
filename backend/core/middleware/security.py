import json
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"x-xss-protection", b"1; mode=block"),
    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    (b"content-security-policy", b"default-src 'self'"),
]


class TenantTokenBucketLimiter:
    """Token-bucket rate limiter partitioned strictly per tenant ID.
    Guarantees tenant isolation and prevents Denial of Service / Wallet starvation."""

    def __init__(self, capacity: int = 1000, refill_rate_per_sec: float = 16.67):
        self.capacity = float(capacity)
        self.refill_rate = float(refill_rate_per_sec)  # 1000 requests per minute
        self._tokens: Dict[str, float] = defaultdict(lambda: self.capacity)
        self._last_update: Dict[str, float] = defaultdict(time.time)

    def consume(self, tenant_id: str, tokens: float = 1.0) -> Tuple[bool, float]:
        now = time.time()
        last = self._last_update[tenant_id]
        elapsed = max(0.0, now - last)
        self._last_update[tenant_id] = now

        current_tokens = min(self.capacity, self._tokens[tenant_id] + elapsed * self.refill_rate)
        if current_tokens >= tokens:
            self._tokens[tenant_id] = current_tokens - tokens
            return True, 0.0
        else:
            self._tokens[tenant_id] = current_tokens
            needed = tokens - current_tokens
            retry_after = needed / self.refill_rate if self.refill_rate > 0 else 60.0
            return False, retry_after

    def get_status(self, tenant_id: str) -> Dict[str, float]:
        now = time.time()
        last = self._last_update[tenant_id]
        elapsed = max(0.0, now - last)
        tokens = min(self.capacity, self._tokens[tenant_id] + elapsed * self.refill_rate)
        return {
            "capacity": self.capacity,
            "available_tokens": round(tokens, 2),
            "refill_rate_per_sec": self.refill_rate,
        }


class SecurityMiddleware:
    """Pure ASGI middleware (not BaseHTTPMiddleware) to avoid the documented
    Starlette hang that occurs when multiple BaseHTTPMiddleware subclasses are
    stacked on the same app — see core/middleware/profiling.py for the same fix."""

    def __init__(self, app, rate_limit: int = 200, tenant_capacity: int = 1000):
        self.app = app
        self.rate_limit = rate_limit
        self.window_seconds = 60
        # In-memory sliding window rate limiter: client_ip -> list of timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()
        # Tenant token bucket governor
        self.tenant_limiter = TenantTokenBucketLimiter(capacity=tenant_capacity)

    def _get_client_ip(self, scope) -> str:
        client = scope.get("client")
        if client:
            return client[0]
        headers = dict(scope.get("headers") or [])
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            return forwarded.decode().split(",")[0].strip()
        return "127.0.0.1"

    def _get_tenant_id(self, scope) -> str:
        headers = dict(scope.get("headers") or [])
        tenant_hdr = headers.get(b"x-tenant-id")
        if tenant_hdr:
            try:
                return tenant_hdr.decode("utf-8").strip() or "default"
            except UnicodeDecodeError:
                pass
        return "default"

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

        headers = dict(scope.get("headers") or [])
        path = scope.get("path", "")
        tenant_id = self._get_tenant_id(scope)

        # 1. Request Size Limits (100 MB for uploads, 50 MB for standard endpoints)
        content_length = headers.get(b"content-length")
        is_upload = any(p in path for p in ["/upload", "/storage", "/data-dock", "/data/"])
        max_bytes = 100 * 1024 * 1024 if is_upload else 50 * 1024 * 1024

        if content_length and int(content_length) > max_bytes:
            body = json.dumps({
                "detail": "Payload Too Large",
                "max_allowed_bytes": max_bytes,
                "received_bytes": int(content_length)
            }).encode()
            await send({
                "type": "http.response.start",
                "status": 413,
                "headers": [(b"content-type", b"application/json")],
            })
            await send({"type": "http.response.body", "body": body})
            return

        # 2. Rate Limiting Enforcement (Sliding Window per IP)
        client_ip = self._get_client_ip(scope)
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

        # 3. Tenant-Scoped Token Bucket Governance
        allowed, retry_after = self.tenant_limiter.consume(tenant_id)
        if not allowed:
            body = json.dumps({
                "detail": f"Tenant '{tenant_id}' request rate quota exceeded.",
                "tenant_id": tenant_id,
                "retry_after_seconds": round(retry_after, 2)
            }).encode()
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", str(int(retry_after) + 1).encode()),
                    (b"x-agentix-tenant-id", tenant_id.encode())
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                resp_headers = list(message.get("headers", [])) + SECURITY_HEADERS
                resp_headers.append((b"x-agentix-tenant-id", tenant_id.encode()))
                message["headers"] = resp_headers
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
