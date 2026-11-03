from __future__ import annotations

from typing import Dict, Literal

from pydantic import BaseModel, Field, field_validator

from app.config import APPLICATION_PRESETS, CRITERIA, MAX_TRIALS, MIN_TRIALS, DEFAULT_TRIALS, CANDIDATES


class Requirements(BaseModel):
    """What the application needs, in plain terms."""

    organization_name: str = Field("", max_length=100)
    application_name: str = Field("", max_length=100)
    application_type: str = "intranet_portal"
    min_security_category: Literal[1, 3, 5] = 1
    priorities: Dict[str, int] = Field(default_factory=lambda: dict(APPLICATION_PRESETS["intranet_portal"]["priorities"]))
    finalized_standards_only: bool = True

    @field_validator("organization_name", "application_name")
    @classmethod
    def _clean_text(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("application_type")
    @classmethod
    def _known_type(cls, value: str) -> str:
        if value not in APPLICATION_PRESETS:
            raise ValueError("Choose one of the listed application types.")
        return value

    @field_validator("priorities")
    @classmethod
    def _valid_priorities(cls, value: Dict[str, int]) -> Dict[str, int]:
        if set(value) != set(CRITERIA):
            raise ValueError("Set a priority for security, speed, size and resources.")
        for key, level in value.items():
            if isinstance(level, bool) or level not in (0, 1, 2, 3):
                raise ValueError(f"Priority for {key} must be between 0 (not needed) and 3 (critical).")
        if sum(value.values()) == 0:
            raise ValueError("Choose at least one thing that matters to your application.")
        return value


class BenchmarkRunRequest(BaseModel):
    trials: int = Field(DEFAULT_TRIALS, ge=MIN_TRIALS, le=MAX_TRIALS)


class VerifyRequest(BaseModel):
    mechanism: str

    @field_validator("mechanism")
    @classmethod
    def _known(cls, value: str) -> str:
        if value not in CANDIDATES:
            raise ValueError("Unknown algorithm option.")
        return value


class ReportRequest(BaseModel):
    requirements: Requirements = Field(default_factory=Requirements)
    format: Literal["html", "md", "json"] = "html"
