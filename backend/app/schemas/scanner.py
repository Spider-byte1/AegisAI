from pydantic import BaseModel


class ScanRequest(BaseModel):
    target: str


class ScanResponse(BaseModel):
    target: str
    ports: list[int]
    status: str