from pydantic import BaseModel


class ScanRequest(BaseModel):
    target: str


class ScanResponse(BaseModel):
    id: int
    target: str
    status: str
    risk: str

    class Config:
        from_attributes = True