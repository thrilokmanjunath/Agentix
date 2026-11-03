import hashlib
import math
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class VectorDocument:
    doc_id: str
    tenant_id: str
    text: str
    dataset_name: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: List[float] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)


def _compute_deterministic_embedding(text: str, dim: int = 128) -> List[float]:
    """Generates a normalized dense vector embedding deterministically from text tokens.
    Guarantees fast, air-gapped local execution without external model dependencies."""
    tokens = re.findall(r'\b\w+\b', text.lower())
    if not tokens:
        return [0.0] * dim

    vec = [0.0] * dim
    for token in tokens:
        # Use SHA-256 seed per token to distribute weight across vector dimensions
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) else -1.0
        vec[idx] += sign

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 1e-9:
        vec = [x / norm for x in vec]
    return vec


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    return max(-1.0, min(1.0, dot))


class TenantVectorStore:
    """Thread-safe, tenant-isolated vector store designed for enterprise multi-tenancy.
    All indexing and queries are strictly bound to tenant_id boundaries."""

    def __init__(self, dim: int = 128):
        self.dim = dim
        self._lock = threading.RLock()
        # tenant_id -> list of VectorDocument
        self._stores: Dict[str, List[VectorDocument]] = {}

    def chunk_text(self, text: str, chunk_size: int = 400, chunk_overlap: int = 40) -> List[str]:
        """Splits arbitrary text into overlapping chunks respecting sentence/word boundaries."""
        words = text.split()
        if not words:
            return []
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += max(1, chunk_size - chunk_overlap)
        return chunks

    def ingest_document(
        self,
        tenant_id: str,
        text: str,
        dataset_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        embedding: Optional[List[float]] = None,
    ) -> str:
        """Embeds and indexes a single document chunk within the tenant's isolated vector partition."""
        meta = metadata or {}
        doc_id = hashlib.sha256(f"{tenant_id}:{dataset_name}:{text}:{time.time()}".encode()).hexdigest()[:16]
        emb = embedding or _compute_deterministic_embedding(text, self.dim)

        doc = VectorDocument(
            doc_id=doc_id,
            tenant_id=tenant_id,
            text=text,
            dataset_name=dataset_name,
            metadata=meta,
            embedding=emb,
        )

        with self._lock:
            if tenant_id not in self._stores:
                self._stores[tenant_id] = []
            self._stores[tenant_id].append(doc)

        return doc_id

    def ingest_text(
        self,
        tenant_id: str,
        text: str,
        dataset_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Splits text into chunks and indexes all chunks under the tenant's partition."""
        chunks = self.chunk_text(text)
        doc_ids = []
        for i, chunk in enumerate(chunks):
            meta = dict(metadata or {})
            meta["chunk_index"] = i
            meta["total_chunks"] = len(chunks)
            doc_id = self.ingest_document(
                tenant_id=tenant_id,
                text=chunk,
                dataset_name=dataset_name,
                metadata=meta,
            )
            doc_ids.append(doc_id)
        return doc_ids

    def search(
        self,
        tenant_id: str,
        query: str,
        dataset_name: Optional[str] = None,
        top_k: int = 3,
        min_similarity: float = 0.05,
    ) -> List[Tuple[VectorDocument, float]]:
        """Searches strictly within tenant_id's documents for the query.
        Returns top_k (VectorDocument, similarity_score) tuples ordered descending by relevance."""
        query_emb = _compute_deterministic_embedding(query, self.dim)

        with self._lock:
            docs = self._stores.get(tenant_id, [])
            scored: List[Tuple[VectorDocument, float]] = []

            for doc in docs:
                if dataset_name and doc.dataset_name and doc.dataset_name != dataset_name:
                    continue
                score = _cosine_similarity(query_emb, doc.embedding)
                if score >= min_similarity:
                    scored.append((doc, score))

            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[:top_k]

    def clear_tenant(self, tenant_id: str):
        with self._lock:
            if tenant_id in self._stores:
                del self._stores[tenant_id]

    def count(self, tenant_id: str) -> int:
        with self._lock:
            return len(self._stores.get(tenant_id, []))


tenant_vector_store = TenantVectorStore()
