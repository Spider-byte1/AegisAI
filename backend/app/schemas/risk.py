from pydantic import BaseModel

class RiskRequest(BaseModel):
    ports: list[int]
    vulnerabilities: list[str]