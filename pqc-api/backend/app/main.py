"""FastAPI application: stateless decision-support API.

Benchmark results are stored in ``data/benchmark_results.json``; everything
else (requirements, assessment, report) is computed per request."""
from __future__ import annotations

import json
import logging
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.benchmark.engine import JOB, BenchmarkError, candidate_status, get_environment, library_info, load_stored_results
from app.benchmark.verify import verify_exchange
from app.config import (
    APPLICATION_PRESETS,
    CORS_ORIGINS,
    CRITERIA,
    CRITERIA_INFO,
    DEFAULT_TRIALS,
    MAX_TRIALS,
    MIN_TRIALS,
    PRIORITY_LEVELS,
    SECURITY_LEVELS,
)
from app.recommendation.engine import AssessmentError, assess
from app.recommendation.guidance import build_guidance
from app.report.builder import build_report, to_html, to_markdown
from app.schemas.models import BenchmarkRunRequest, ReportRequest, Requirements, VerifyRequest
from app.scoring.engine import priorities_to_weights

log = logging.getLogger("pqc.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Detect liboqs in the background so the first screen is not delayed.
    threading.Thread(target=library_info, daemon=True).start()
    yield


app = FastAPI(lifespan=lifespan, title="PQC KEM Decision Framework", docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    messages = []
    for item in exc.errors():
        text = str(item.get("msg", "Invalid value")).removeprefix("Value error, ")
        messages.append(text)
    return _error(422, "invalid_input", " ".join(dict.fromkeys(messages)) or "Some of the information entered is not valid.")


@app.exception_handler(BenchmarkError)
async def benchmark_handler(_: Request, exc: BenchmarkError) -> JSONResponse:
    return _error(409, "benchmark_unavailable", str(exc))


@app.exception_handler(AssessmentError)
async def assessment_handler(_: Request, exc: AssessmentError) -> JSONResponse:
    return _error(422, "assessment_failed", str(exc))


@app.exception_handler(Exception)
async def unexpected_handler(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error", exc_info=exc)  # technical detail stays in the log
    return _error(500, "internal_error", "Something went wrong on the server. Please try again.")


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/requirements/options")
def requirement_options() -> Dict[str, Any]:
    return {
        "application_types": [{"id": k, **v} for k, v in APPLICATION_PRESETS.items()],
        "security_levels": [{"category": k, **v} for k, v in SECURITY_LEVELS.items()],
        "priority_levels": [{"value": k, "label": v} for k, v in PRIORITY_LEVELS.items()],
        "criteria": [{"id": c, **CRITERIA_INFO[c]} for c in CRITERIA],
        "benchmark": {"min_trials": MIN_TRIALS, "max_trials": MAX_TRIALS, "default_trials": DEFAULT_TRIALS},
    }


@app.get("/api/environment")
def environment() -> Dict[str, Any]:
    return {"machine": get_environment(), "library": library_info()}


@app.get("/api/candidates")
def candidates() -> Dict[str, Any]:
    return {"candidates": candidate_status(), "library": library_info()}


@app.get("/api/benchmarks")
def benchmarks() -> Dict[str, Any]:
    """Stored benchmark results. This never runs a benchmark."""
    stored = load_stored_results()
    return {"has_data": bool(stored), "results": stored}


@app.post("/api/benchmarks/run", status_code=202)
def run_benchmarks(payload: BenchmarkRunRequest) -> Dict[str, Any]:
    JOB.start(payload.trials)
    return JOB.snapshot()


@app.get("/api/benchmarks/status")
def benchmark_status() -> Dict[str, Any]:
    return JOB.snapshot()


@app.post("/api/assessment")
def assessment(requirements: Requirements) -> Dict[str, Any]:
    result = assess(requirements)
    result["implementation"] = build_guidance(result["ranking"][0])
    return result


@app.post("/api/weights/preview")
def weights_preview(requirements: Requirements) -> Dict[str, Any]:
    return {"weights": priorities_to_weights(requirements.priorities)}


@app.post("/api/verify")
def verify(payload: VerifyRequest) -> Dict[str, Any]:
    return verify_exchange(payload.mechanism)


@app.post("/api/report", response_model=None)
def report(payload: ReportRequest) -> Response:
    data = build_report(assess(payload.requirements))
    if payload.format == "json":
        return Response(json.dumps(data, indent=2), media_type="application/json", headers={"Content-Disposition": "attachment; filename=pqc-assessment-report.json"})
    if payload.format == "md":
        return Response(to_markdown(data), media_type="text/markdown; charset=utf-8", headers={"Content-Disposition": "attachment; filename=pqc-assessment-report.md"})
    return Response(to_html(data), media_type="text/html; charset=utf-8", headers={"Content-Disposition": "attachment; filename=pqc-assessment-report.html"})
