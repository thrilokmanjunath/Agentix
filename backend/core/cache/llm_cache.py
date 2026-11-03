import hashlib
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class CacheEntry:
    response: str
    created_at: float
    expires_at: float
    hit_count: int = 0
    tenant_id: str = "default"
    model: str = ""


class LLMCache:
    """Thread-safe, tenant-partitioned exact-match inference response cache.
    Eliminates redundant local inference compute and reduces latency from seconds to < 5ms."""

    def __init__(self, default_ttl_seconds: int = 3600):
        self.default_ttl = default_ttl_seconds
        self._lock = threading.RLock()
        self._cache: Dict[str, CacheEntry] = {}
        self._hits = 0
        self._misses = 0
        self._latency_saved_ms = 0.0

    def _generate_key(self, tenant_id: str, model: str, template_id: str, prompt: str) -> str:
        raw = f"{tenant_id}:{model}:{template_id}:{prompt.strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(
        self,
        tenant_id: str,
        model: str,
        template_id: str,
        prompt: str,
    ) -> Optional[str]:
        key = self._generate_key(tenant_id, model, template_id, prompt)
        now = time.time()

        with self._lock:
            entry = self._cache.get(key)
            if entry:
                if entry.expires_at > now:
                    entry.hit_count += 1
                    self._hits += 1
                    # Estimated local LLM execution latency saved per hit (~1500ms)
                    self._latency_saved_ms += 1500.0
                    return entry.response
                else:
                    # Expired
                    del self._cache[key]

            self._misses += 1
            return None

    def set(
        self,
        tenant_id: str,
        model: str,
        template_id: str,
        prompt: str,
        response: str,
        ttl_seconds: Optional[int] = None,
    ):
        key = self._generate_key(tenant_id, model, template_id, prompt)
        now = time.time()
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl

        with self._lock:
            self._cache[key] = CacheEntry(
                response=response,
                created_at=now,
                expires_at=now + ttl,
                tenant_id=tenant_id,
                model=model,
            )

    def invalidate_tenant(self, tenant_id: str) -> int:
        with self._lock:
            keys_to_delete = [k for k, v in self._cache.items() if v.tenant_id == tenant_id]
            for k in keys_to_delete:
                del self._cache[k]
            return len(keys_to_delete)

    def clear(self):
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
            self._latency_saved_ms = 0.0

    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            total = self._hits + self._misses
            hit_ratio = round((self._hits / total) if total > 0 else 0.0, 4)
            return {
                "cached_entries": len(self._cache),
                "total_requests": total,
                "hits": self._hits,
                "misses": self._misses,
                "hit_ratio": hit_ratio,
                "estimated_latency_saved_seconds": round(self._latency_saved_ms / 1000.0, 2),
            }


llm_cache = LLMCache()
