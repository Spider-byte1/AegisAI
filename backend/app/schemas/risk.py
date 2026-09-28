from pydantic import BaseModel


class PortInfo(BaseModel):
    port: int
    service: str | None = None


class VulnerabilityInfo(BaseModel):
    name: str
    severity: str


class RiskRequest(BaseModel):
    ports: list[PortInfo]
    vulnerabilities: list[VulnerabilityInfo]