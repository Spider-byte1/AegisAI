from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    target: str = Field(min_length=1, max_length=253)
    # The user must confirm they are allowed to scan this target.
    authorized: bool = False
