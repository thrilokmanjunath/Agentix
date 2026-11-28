import time
import base64
import hmac
import hashlib
import struct
import pytest

def test_totp_generation_and_verification():
    from core.auth.totp import (
        generate_totp_secret,
        get_totp_uri,
        verify_totp_code,
        generate_qr_svg_data_uri,
    )
    secret = generate_totp_secret()
    assert len(secret) == 32
    assert secret.isalnum()
    
    uri = get_totp_uri(secret, "admin@agentix.com")
    assert uri.startswith("otpauth://totp/Agentix:admin@agentix.com")
    assert f"secret={secret}" in uri
    assert "issuer=Agentix" in uri
    
    # Generate QR SVG data URI
    qr_data_uri = generate_qr_svg_data_uri(uri)
    assert qr_data_uri.startswith("data:image/svg+xml;base64,")
    
    # Calculate current TOTP code directly per RFC 6238
    time_step = int(time.time() // 30)
    key = base64.b32decode(secret, True)
    msg = struct.pack(">Q", time_step)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code_int = struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF
    valid_code = f"{code_int % 1000000:06d}"
    
    valid, ts = verify_totp_code(secret, valid_code)
    assert valid is True
    assert ts == time_step
    
    # Replay protection: reusing the same timestamp must fail
    valid_replay, _ = verify_totp_code(secret, valid_code, last_time_step=time_step)
    assert valid_replay is False

    # Invalid code must fail
    invalid_code = "000000" if valid_code != "000000" else "111111"
    valid_invalid, _ = verify_totp_code(secret, invalid_code)
    assert valid_invalid is False


def test_totp_time_drift_window():
    from core.auth.totp import generate_totp_secret, verify_totp_code
    secret = generate_totp_secret()
    now_ts = int(time.time() // 30)
    
    # Compute code for previous window (-1)
    prev_ts = now_ts - 1
    key = base64.b32decode(secret, True)
    msg = struct.pack(">Q", prev_ts)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code_int = struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF
    prev_code = f"{code_int % 1000000:06d}"
    
    valid, ts = verify_totp_code(secret, prev_code)
    assert valid is True
    assert ts == prev_ts


def test_backup_codes_generation_and_hashing():
    from core.auth.totp import generate_backup_codes, hash_backup_code
    codes = generate_backup_codes(10)
    assert len(codes) == 10
    for code in codes:
        assert len(code) == 9 # XXXX-XXXX
        assert code[4] == "-"
    
    h1 = hash_backup_code(codes[0])
    h2 = hash_backup_code(codes[0].lower().replace("-", ""))
    assert len(h1) == 64 # SHA-256 hex digest
    assert h1 == h2 # Normalized verification
