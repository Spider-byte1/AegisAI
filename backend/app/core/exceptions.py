class AegisException(Exception):
    """Expected, user-facing application error (rendered as JSON by error_handler)."""

    def __init__(self, message: str, code: str = "GENERAL_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
