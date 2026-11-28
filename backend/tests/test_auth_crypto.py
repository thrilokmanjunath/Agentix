import pytest

def test_aes_gcm_encryption_roundtrip():
    from core.auth.crypto import encrypt_secret, decrypt_secret
    secret = "JBSWY3DPEHPK3PXP"
    encrypted = encrypt_secret(secret)
    assert encrypted != secret
    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret

def test_aes_gcm_tampered_ciphertext_fails():
    from core.auth.crypto import encrypt_secret, decrypt_secret
    secret = "JBSWY3DPEHPK3PXP"
    encrypted = encrypt_secret(secret)
    tampered = encrypted[:-4] + "AAAA"
    with pytest.raises(Exception):
        decrypt_secret(tampered)

def test_aes_gcm_custom_key():
    from core.auth.crypto import encrypt_secret, decrypt_secret
    custom_key = "my-super-secret-custom-key-32-chars-long"
    secret = "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ"
    encrypted = encrypt_secret(secret, key_override=custom_key)
    decrypted = decrypt_secret(encrypted, key_override=custom_key)
    assert decrypted == secret
