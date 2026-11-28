import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def _get_derived_key(key_override: Optional[str] = None) -> bytes:
    raw_key = (
        key_override
        or os.getenv("ENCRYPTION_KEY")
        or os.getenv("JWT_SECRET_KEY")
        or os.getenv("JWT_SECRET")
    )
    if not raw_key:
        env = os.getenv("ENVIRONMENT", "development")
        if env != "development":
            raise RuntimeError("ENCRYPTION_KEY or JWT_SECRET_KEY must be set in non-development environment")
        raw_key = "super-secret-agentix-key-2026"
    return hashlib.sha256(raw_key.encode("utf-8")).digest()

def encrypt_secret(plaintext: str, key_override: Optional[str] = None) -> str:
    """Encrypt a secret string using AES-256-GCM.
    Returns URL-safe base64 string formatted as: base64(12-byte nonce + ciphertext + 16-byte tag)."""
    if not plaintext:
        return ""
    key = _get_derived_key(key_override)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")

def decrypt_secret(ciphertext_b64: str, key_override: Optional[str] = None) -> str:
    """Decrypt an AES-256-GCM encrypted base64 payload."""
    if not ciphertext_b64:
        return ""
    key = _get_derived_key(key_override)
    aesgcm = AESGCM(key)
    raw_data = base64.b64decode(ciphertext_b64.encode("ascii"))
    if len(raw_data) < 28: # 12 bytes nonce + 16 bytes tag
        raise ValueError("Invalid encrypted secret payload length")
    nonce = raw_data[:12]
    ciphertext = raw_data[12:]
    decrypted = aesgcm.decrypt(nonce, ciphertext, None)
    return decrypted.decode("utf-8")
