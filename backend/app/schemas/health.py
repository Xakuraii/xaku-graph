from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ModuleStatus(BaseModel):
    name: str
    phase: int
    status: str
    description: str


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    version: str = Field(..., json_schema_extra={"example": "1.0.0"})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    timestamp: datetime
    modules: dict[str, ModuleStatus]
    system_info: dict[str, Any]
