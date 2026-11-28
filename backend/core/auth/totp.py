import io
import time
import base64
import hmac
import hashlib
import struct
import secrets
import urllib.parse
from typing import Optional, Tuple, List
import qrcode
import qrcode.image.svg

BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

def generate_totp_secret(length: int = 32) -> str:
    """Generate a cryptographically secure 160-bit (32 character) Base32 secret."""
    return "".join(secrets.choice(BASE32_ALPHABET) for _ in range(length))

def get_totp_uri(secret: str, email: str, issuer: str = "Agentix") -> str:
    """Generate RFC 6238 Key URI formatted for Google Authenticator and compatible apps."""
    clean_secret = secret.strip().replace(" ", "").upper()
    label = f"{issuer}:{email}"
    params = {
        "secret": clean_secret,
        "issuer": issuer,
        "algorithm": "SHA1",
        "digits": "6",
        "period": "30",
    }
    query_string = urllib.parse.urlencode(params)
    return f"otpauth://totp/{label}?{query_string}"

def generate_qr_svg_data_uri(otpauth_uri: str) -> str:
    """Generate a clean SVG QR code data URI from an otpauth URI."""
    factory = qrcode.image.svg.SvgPathImage
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
        image_factory=factory,
    )
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    img = qr.make_image()
    
    buf = io.BytesIO()
    img.save(buf)
    svg_bytes = buf.getvalue()
    b64 = base64.b64encode(svg_bytes).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"

def compute_totp_code(secret: str, time_step: int) -> str:
    """Compute 6-digit TOTP code for a specific 30-second time step per RFC 6238."""
    clean_secret = secret.strip().replace(" ", "").upper()
    padding = (8 - len(clean_secret) % 8) % 8
    key = base64.b32decode(clean_secret + "=" * padding, True)
    msg = struct.pack(">Q", time_step)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = struct.unpack(">I", digest[offset:offset+4])[0] & 0x7FFFFFFF
    return f"{code_int % 1000000:06d}"

def verify_totp_code(
    secret: str,
    code: str,
    last_time_step: Optional[int] = None,
    window: int = 1,
) -> Tuple[bool, Optional[int]]:
    """Verify a 6-digit TOTP code against time drift (-1, 0, +1 windows) with replay protection.
    Returns (is_valid, successful_time_step)."""
    if not secret or not code:
        return False, None
    clean_code = code.strip().replace(" ", "")
    if len(clean_code) != 6 or not clean_code.isdigit():
        return False, None

    current_time_step = int(time.time() // 30)
    for offset in (0, -1, 1):
        step = current_time_step + offset
        if last_time_step is not None and step <= last_time_step:
            # Replay protection: cannot accept a step that was already used or older than last used step
            continue
        try:
            expected = compute_totp_code(secret, step)
            if hmac.compare_digest(expected, clean_code):
                return True, step
        except Exception:
            continue
    return False, None

def generate_backup_codes(count: int = 10) -> List[str]:
    """Generate single-use alphanumeric recovery backup codes (XXXX-XXXX format)."""
    charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    codes = []
    for _ in range(count):
        part1 = "".join(secrets.choice(charset) for _ in range(4))
        part2 = "".join(secrets.choice(charset) for _ in range(4))
        codes.append(f"{part1}-{part2}")
    return codes

def hash_backup_code(code: str) -> str:
    """Hash backup code using SHA-256 with normalization."""
    normalized = code.strip().upper().replace("-", "").replace(" ", "")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
