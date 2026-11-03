import base64
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class GuardrailResult:
    is_safe: bool
    jailbreak_detected: bool
    jailbreak_reasons: List[str] = field(default_factory=list)
    pii_counts: Dict[str, int] = field(default_factory=dict)
    sanitized_text: str = ""
    error_detail: Optional[str] = None


class GuardrailEngine:
    """Enterprise AI Guardrail Engine implementing multi-pattern adversarial jailbreak detection,
    base64 obfuscation inspection, bidirectional PII detection & redaction, and output leakage prevention."""

    # Adversarial & Jailbreak Patterns
    JAILBREAK_PATTERNS = [
        (re.compile(r'(?i)ignore\s+(all\s+)?(previous|prior)\s+instructions'), "Direct instruction override"),
        (re.compile(r'(?i)disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts)'), "Directive disregard"),
        (re.compile(r'(?i)(reveal|show|print|leak|display)\s+(your\s+)?(system\s+prompt|initial\s+instructions|core\s+prompt)'), "System prompt extraction"),
        (re.compile(r'(?i)(you\s+are\s+now|act\s+as)\s+(DAN|unfiltered|jailbroken|unrestricted|an\s+evil\s+AI)'), "Adversarial persona adoption"),
        (re.compile(r'(?i)developer\s+mode\s+(is\s+)?(enabled|active|on)'), "Developer mode bypass"),
        (re.compile(r'(?i)i\s*g\s*n\s*o\s*r\s*e\s+a\s*l\s*l'), "Obfuscated leetspeak instruction bypass"),
        (re.compile(r'(?i)d\s*i\s*s\s*r\s*e\s*g\s*a\s*r\s*d'), "Obfuscated leetspeak disregard"),
        (re.compile(r'(<\|im_start\|>|<\|endoftext\|>|\[SYSTEM_DIRECTIVE\]|<\?system)'), "ChatML delimiter injection"),
    ]

    # PII Regular Expressions
    PII_PATTERNS = {
        "SSN": re.compile(r'\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b'),
        "CREDIT_CARD": re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b'),
        "EMAIL": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        "PHONE": re.compile(r'(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b'),
        "API_KEY": re.compile(r'\b(AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|ey[A-Za-z0-9-_]{10,}\.ey[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}|(?:sk-[a-zA-Z0-9]{32,}))\b'),
    }

    BASE64_BLOCK = re.compile(r'[A-Za-z0-9+/]{16,}={0,2}')

    def detect_jailbreak(self, text: str) -> Tuple[bool, List[str]]:
        """Scans for adversarial injection attempts in raw, decoded, and obfuscated text."""
        reasons = []

        # 1. Direct Pattern Matching
        for pattern, reason in self.JAILBREAK_PATTERNS:
            if pattern.search(text):
                reasons.append(reason)

        # 2. Base64 Obfuscation Scanning
        for match in self.BASE64_BLOCK.finditer(text):
            candidate = match.group(0)
            try:
                decoded = base64.b64decode(candidate).decode("utf-8", errors="ignore")
                for pattern, reason in self.JAILBREAK_PATTERNS:
                    if pattern.search(decoded):
                        reasons.append(f"Base64-encoded jailbreak attempt: {reason}")
            except Exception:
                pass

        return len(reasons) > 0, reasons

    def redact_pii(self, text: str) -> Tuple[str, Dict[str, int]]:
        """Replaces detected PII tokens with safe pseudonymized placeholders."""
        sanitized = text
        counts: Dict[str, int] = {}

        for pii_type, pattern in self.PII_PATTERNS.items():
            matches = pattern.findall(sanitized)
            if matches:
                counts[pii_type] = len(matches)
                sanitized = pattern.sub(f"[REDACTED_{pii_type}]", sanitized)

        return sanitized, counts

    def scan_output(self, output_text: str) -> Tuple[bool, str]:
        """Validates model output to ensure zero system prompt leakage or secret exposure."""
        leak_patterns = [
            (re.compile(r'(?i)(here\s+is\s+my\s+system\s+prompt|my\s+initial\s+instructions\s+were:)'), "System prompt leakage detected"),
            (re.compile(r'\b(JWT_SECRET|SECRET_KEY|DATABASE_URL)\s*=\s*[^\s]+'), "Configuration credential leakage detected"),
        ]
        for pattern, reason in leak_patterns:
            if pattern.search(output_text):
                return False, f"Output safety failure: {reason}"
        return True, output_text

    def sanitize_input(self, text: str) -> GuardrailResult:
        """Complete input safety validation, adversarial neutralization with [filtered], and PII redaction pipeline."""
        raw = (text or "").strip()
        if len(raw) > 5000:
            raw = raw[:5000]

        is_jailbreak, reasons = self.detect_jailbreak(raw)

        # Neutralize jailbreak patterns with [filtered]
        filtered_text = raw
        for pattern, _ in self.JAILBREAK_PATTERNS:
            filtered_text = pattern.sub("[filtered]", filtered_text)

        redacted_text, pii_counts = self.redact_pii(filtered_text)

        return GuardrailResult(
            is_safe=not is_jailbreak,
            jailbreak_detected=is_jailbreak,
            jailbreak_reasons=reasons,
            pii_counts=pii_counts,
            sanitized_text=redacted_text,
            error_detail=f"Security Guardrail Notification: Adversarial injection patterns neutralized ({', '.join(reasons)})." if is_jailbreak else None,
        )


guardrail_engine = GuardrailEngine()
