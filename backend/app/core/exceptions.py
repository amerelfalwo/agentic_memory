from typing import Any, Optional

class DomainException(Exception):
    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)

class SecurityViolationException(DomainException):
    def __init__(self, pattern: str):
        super().__init__(
            code="SECURITY_GUARDRAIL_BLOCKED",
            message="Prompt contains potentially unsafe instructions or prompt override attempts.",
            details={"matched_pattern": pattern}
        )

class MemoryNotFoundException(DomainException):
    def __init__(self, memory_type: str, identifier: str):
        super().__init__(
            code="MEMORY_NOT_FOUND",
            message=f"Memory record of type '{memory_type}' with id '{identifier}' was not found.",
            details={"memory_type": memory_type, "identifier": identifier}
        )
