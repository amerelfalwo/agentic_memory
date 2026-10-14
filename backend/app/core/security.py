import re
from typing import Optional, Tuple

SUSPICIOUS_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"system\s+prompt\s+override",
    r"reveal\s+(the\s+)?system\s+prompt",
    r"sudo\s+mode",
    r"you\s+are\s+now\s+in\s+unfiltered\s+mode",
    r"bypass\s+all\s+rules",
    r"disregard\s+all\s+guidelines"
]

def check_prompt_security(text: str) -> Tuple[bool, Optional[str]]:
    """
    Scans incoming text against prompt injection and override patterns.
    Returns (is_safe: bool, matched_pattern: Optional[str]).
    """
    if not text:
        return True, None
    for pattern in SUSPICIOUS_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return False, match.group(0)
    return True, None
