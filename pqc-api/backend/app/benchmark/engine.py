"""Real benchmark engine built on liboqs (via the ``oqs`` Python binding).

Rules enforced here:
  * mechanisms are discovered from the library at run time; nothing is assumed
  * only mechanisms the library reports as enabled are benchmarked
  * every trial verifies that decapsulation recovers the encapsulated secret
  * a mechanism with any failed check, non-positive timing or wrong object size
    is rejected entirely (no record is produced for it)
  * no value is ever invented; if liboqs is missing, no new results can be made
"""
from __future__ import annotations

import logging
import math
import os
import platform
import statistics
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from app.config import (
    BENCHMARK_PATH,
    CANDIDATE_ORDER,
    CANDIDATES,
    DEFAULT_TRIALS,
    MAX_TRIALS,
    MIN_TRIALS,
    WARMUP_TRIALS,
)
from app.utils.io import load_json, save_json

log = logging.getLogger("pqc.benchmark")
SCHEMA_VERSION = 2
OP_FIELDS = ("keygen_us", "encapsulation_us", "decapsulation_us")
SIZE_FIELDS = ("public_key_bytes", "secret_key_bytes", "ciphertext_bytes", "shared_secret_bytes")


class BenchmarkError(Exception):
    """Raised for benchmark problems. The message is safe to show to users."""


# --------------------------------------------------------------------------
# liboqs discovery
# --------------------------------------------------------------------------
_oqs_cache: Dict[str, Any] = {}


def _load_oqs():
    """Import the binding lazily. Missing native library makes ``oqs`` call
    ``sys.exit``, so SystemExit is caught on purpose."""
    if "module" in _oqs_cache:
        return _oqs_cache["module"], _oqs_cache.get("error")
    try:
        import oqs  # type: ignore

        if not hasattr(oqs, "KeyEncapsulation"):
            from oqs import oqs as oqs  # type: ignore  # older package layout
        _oqs_cache["module"], _oqs_cache["error"] = oqs, None
    except (Exception, SystemExit) as exc:  # noqa: BLE001
        log.warning("liboqs could not be loaded: %r", exc)
        _oqs_cache["module"] = None
        _oqs_cache["error"] = "The liboqs cryptographic library is not installed or could not be loaded."
    return _oqs_cache["module"], _oqs_cache["error"]


def reset_discovery_cache() -> None:
    _oqs_cache.clear()


def library_info() -> Dict[str, Any]:
    oqs, error = _load_oqs()
    if oqs is None:
        return {"available": False, "version": None, "binding_version": None, "enabled_mechanisms": [], "message": error}
    try:
        enabled = [m for m in oqs.get_enabled_kem_mechanisms()]
    except Exception:  # noqa: BLE001
        log.exception("Could not list enabled KEM mechanisms")
        enabled = []
    version = None
    binding = None
    try:
        version = oqs.oqs_version()
    except Exception:  # noqa: BLE001
        version = getattr(oqs, "OQS_VERSION", None)
    try:
        binding = oqs.oqs_python_version()
    except Exception:  # noqa: BLE001
        binding = None
    message = "liboqs is available." if enabled else "liboqs loaded but reports no enabled KEM mechanisms."
    return {"available": bool(enabled), "version": version, "binding_version": binding, "enabled_mechanisms": enabled, "message": message}


def get_environment() -> Dict[str, Any]:
    ram_gb = None
    try:
        import psutil  # type: ignore

        ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 2)
    except Exception:  # noqa: BLE001
        pass
    cpu = platform.processor() or ""
    try:
        with open("/proc/cpuinfo", encoding="utf-8") as handle:
            for line in handle:
                if line.lower().startswith("model name"):
                    cpu = line.split(":", 1)[1].strip()
                    break
    except OSError:
        pass
    return {
        "os": f"{platform.system()} {platform.release()}".strip(),
        "cpu": cpu or "Unknown CPU",
        "cpu_cores": os.cpu_count(),
        "ram_gb": ram_gb,
        "python_version": platform.python_version(),
    }


# --------------------------------------------------------------------------
# Statistics and validation
# --------------------------------------------------------------------------
def summarize(samples_us: List[float]) -> Dict[str, float]:
    ordered = sorted(samples_us)
    p95_index = max(0, math.ceil(0.95 * len(ordered)) - 1)
    return {
        "median": round(statistics.median(ordered), 3),
        "mean": round(statistics.fmean(ordered), 3),
        "p95": round(ordered[p95_index], 3),
        "min": round(ordered[0], 3),
        "max": round(ordered[-1], 3),
        "stddev": round(statistics.pstdev(ordered), 3) if len(ordered) > 1 else 0.0,
    }


def _positive(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def validate_record(record: Dict[str, Any]) -> None:
    """Raise BenchmarkError unless the record is usable for scoring."""
    name = record.get("mechanism")
    if name not in CANDIDATES:
        raise BenchmarkError(f"Unknown mechanism: {name!r}")
    for field in OP_FIELDS:
        stats = record.get(field)
        if not isinstance(stats, dict) or not _positive(stats.get("median")):
            raise BenchmarkError(f"{name}: missing or non-positive {field} median")
    for field in ("public_key_bytes", "secret_key_bytes", "ciphertext_bytes"):
        if not _positive(record.get(field)):
            raise BenchmarkError(f"{name}: missing or non-positive {field}")


# --------------------------------------------------------------------------
# Benchmarking one mechanism
# --------------------------------------------------------------------------
def benchmark_mechanism(
    mechanism: str,
    trials: int,
    progress: Optional[Callable[[int, int], None]] = None,
) -> Dict[str, Any]:
    oqs, error = _load_oqs()
    if oqs is None:
        raise BenchmarkError(error or "liboqs is unavailable.")
    if mechanism not in CANDIDATES:
        raise BenchmarkError(f"Unsupported mechanism: {mechanism}")
    if mechanism not in oqs.get_enabled_kem_mechanisms():
        raise BenchmarkError(f"{mechanism} is not enabled in the installed liboqs build.")

    keygen: List[float] = []
    encaps: List[float] = []
    decaps: List[float] = []
    with oqs.KeyEncapsulation(mechanism) as kem:
        expected = {
            "public_key_bytes": int(kem.length_public_key),
            "secret_key_bytes": int(kem.length_secret_key),
            "ciphertext_bytes": int(kem.length_ciphertext),
            "shared_secret_bytes": int(kem.length_shared_secret),
        }
        for index in range(WARMUP_TRIALS + trials):
            t0 = time.perf_counter_ns()
            public_key = kem.generate_keypair()
            t1 = time.perf_counter_ns()
            ciphertext, secret_sent = kem.encap_secret(public_key)
            t2 = time.perf_counter_ns()
            secret_received = kem.decap_secret(ciphertext)
            t3 = time.perf_counter_ns()

            if secret_received != secret_sent:
                raise BenchmarkError(f"{mechanism}: decapsulation did not recover the shared secret (trial {index}).")
            if len(public_key) != expected["public_key_bytes"] or len(ciphertext) != expected["ciphertext_bytes"]:
                raise BenchmarkError(f"{mechanism}: produced object sizes do not match the library's declared sizes.")
            if len(secret_sent) != expected["shared_secret_bytes"]:
                raise BenchmarkError(f"{mechanism}: shared secret has an unexpected length.")

            if index >= WARMUP_TRIALS:  # warm-up trials are verified but not timed
                keygen.append((t1 - t0) / 1000.0)
                encaps.append((t2 - t1) / 1000.0)
                decaps.append((t3 - t2) / 1000.0)
                if progress:
                    progress(index - WARMUP_TRIALS + 1, trials)

    family = CANDIDATES[mechanism]["family"]
    record = {
        "mechanism": mechanism,
        "family": family,
        "security_category": CANDIDATES[mechanism]["security_category"],
        "trials": trials,
        "warmup_trials": WARMUP_TRIALS,
        "keygen_us": summarize(keygen),
        "encapsulation_us": summarize(encaps),
        "decapsulation_us": summarize(decaps),
        "integrity_checks_passed": trials + WARMUP_TRIALS,
        **expected,
    }
    validate_record(record)
    return record


# --------------------------------------------------------------------------
# Stored results
# --------------------------------------------------------------------------
def _normalize_legacy_record(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert a record from the first version of this project to schema v2.
    Fields that were never real measurements (cpu_percent, memory_mb,
    migration_readiness) are dropped."""
    name = raw.get("mechanism") or raw.get("parameter_set")
    if name not in CANDIDATES:
        return None
    record: Dict[str, Any] = {
        "mechanism": name,
        "family": CANDIDATES[name]["family"],
        "security_category": CANDIDATES[name]["security_category"],
        "trials": raw.get("trials"),
        "keygen_us": raw.get("keygen_us"),
        "encapsulation_us": raw.get("encapsulation_us"),
        "decapsulation_us": raw.get("decapsulation_us"),
    }
    for field in SIZE_FIELDS:
        record[field] = raw.get(field)
    try:
        validate_record(record)
    except BenchmarkError:
        return None
    return record


def load_stored_results() -> Optional[Dict[str, Any]]:
    """Return the stored benchmark payload (schema v2) or None if none exists."""
    if not BENCHMARK_PATH.exists():
        return None
    try:
        payload = load_json(BENCHMARK_PATH)
    except (OSError, ValueError):
        log.exception("Stored benchmark file is unreadable")
        return None
    if not isinstance(payload, dict):
        return None

    if payload.get("schema_version") == SCHEMA_VERSION:
        records = []
        for raw in payload.get("records", []):
            try:
                validate_record(raw)
                records.append(raw)
            except BenchmarkError:
                log.warning("Dropped invalid stored record: %s", raw.get("mechanism"))
        payload = {**payload, "records": records}
        return payload if records else None

    # Legacy (version 1) file: {"meta": {...}, "benchmark_records": [...]}
    legacy = payload.get("benchmark_records") or []
    records = [r for r in (_normalize_legacy_record(x) for x in legacy) if r]
    if not records:
        return None
    first_env = (legacy[0].get("environment") or {}) if legacy else {}
    environment = {k: first_env.get(k) for k in ("os", "cpu", "ram_gb", "python_version")}
    meta = payload.get("meta") or {}
    return {
        "schema_version": SCHEMA_VERSION,
        "meta": {
            "generated_at": legacy[0].get("timestamp"),
            "library": meta.get("library", "liboqs"),
            "library_version": legacy[0].get("library_version") if legacy[0].get("library_version") not in (None, "unknown") else None,
            "source": "imported from an earlier run of this project",
            "environment": environment,
        },
        "records": records,
        "skipped": [],
    }


def run_benchmark(
    trials: int = DEFAULT_TRIALS,
    progress: Optional[Callable[[str, int, int, int, int], None]] = None,
    save: bool = True,
) -> Dict[str, Any]:
    """Benchmark every available candidate. Returns the new payload.

    ``progress(mechanism, done, total, mech_index, mech_count)`` is optional.
    """
    if not isinstance(trials, int) or isinstance(trials, bool) or not MIN_TRIALS <= trials <= MAX_TRIALS:
        raise BenchmarkError(f"Number of trials must be a whole number between {MIN_TRIALS} and {MAX_TRIALS}.")
    info = library_info()
    if not info["available"]:
        raise BenchmarkError(
            "No supported PQC mechanisms were detected in the current cryptographic environment. "
            "Install liboqs (see the README) to run a benchmark."
        )
    wanted = [m for m in CANDIDATE_ORDER if m in info["enabled_mechanisms"]]
    if not wanted:
        raise BenchmarkError("The installed liboqs build does not provide any ML-KEM or HQC mechanisms.")

    records: List[Dict[str, Any]] = []
    skipped: List[Dict[str, str]] = [
        {"mechanism": m, "reason": "Not enabled in the installed liboqs build."} for m in CANDIDATE_ORDER if m not in wanted
    ]
    for position, mechanism in enumerate(wanted, start=1):
        callback = (lambda done, total, m=mechanism, p=position: progress(m, done, total, p, len(wanted))) if progress else None
        try:
            records.append(benchmark_mechanism(mechanism, trials, callback))
        except BenchmarkError as exc:
            log.error("Benchmark rejected for %s: %s", mechanism, exc)
            skipped.append({"mechanism": mechanism, "reason": str(exc)})
    if not records:
        raise BenchmarkError("Every benchmark was rejected by the integrity checks. See the server log for details.")

    payload = {
        "schema_version": SCHEMA_VERSION,
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "library": "liboqs",
            "library_version": info["version"],
            "binding_version": info["binding_version"],
            "trials": trials,
            "source": "live benchmark",
            "environment": get_environment(),
        },
        "records": records,
        "skipped": skipped,
    }
    if save:
        save_json(BENCHMARK_PATH, payload)
    return payload


# --------------------------------------------------------------------------
# Candidate status (what the UI shows on the Benchmark screen)
# --------------------------------------------------------------------------
def candidate_status() -> List[Dict[str, Any]]:
    info = library_info()
    stored = load_stored_results()
    measured = {r["mechanism"] for r in stored["records"]} if stored else set()
    rows = []
    for name in CANDIDATE_ORDER:
        ref = CANDIDATES[name]
        enabled = name in info["enabled_mechanisms"]
        if name in measured:
            status, text = "benchmarked", "Available and benchmarked"
        elif enabled:
            status, text = "not_benchmarked", "Available in this environment, not yet benchmarked"
        else:
            status, text = "unavailable", "Unavailable in current environment"
        rows.append({
            "mechanism": name,
            "family": ref["family"],
            "security_category": ref["security_category"],
            "standard": ref["standard"],
            "finalized": ref["finalized"],
            "library_enabled": enabled,
            "status": status,
            "status_text": text,
        })
    return rows


# --------------------------------------------------------------------------
# Background job (so the UI can show progress)
# --------------------------------------------------------------------------
class BenchmarkJob:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._state: Dict[str, Any] = {"state": "idle"}

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._state)

    def start(self, trials: int) -> None:
        with self._lock:
            if self._state.get("state") == "running":
                raise BenchmarkError("A benchmark is already running. Please wait for it to finish.")
            self._state = {"state": "running", "trials": trials, "mechanism": None, "done": 0, "total": trials, "mechanism_index": 0, "mechanism_count": 0, "started_at": time.time()}
        info = library_info()
        if not info["available"]:
            with self._lock:
                self._state = {"state": "failed", "message": "No supported PQC mechanisms were detected in the current cryptographic environment."}
            raise BenchmarkError("No supported PQC mechanisms were detected in the current cryptographic environment.")
        threading.Thread(target=self._run, args=(trials,), daemon=True).start()

    def _on_progress(self, mechanism: str, done: int, total: int, index: int, count: int) -> None:
        with self._lock:
            self._state.update(mechanism=mechanism, done=done, total=total, mechanism_index=index, mechanism_count=count)

    def _run(self, trials: int) -> None:
        try:
            payload = run_benchmark(trials, progress=self._on_progress)
            with self._lock:
                self._state = {"state": "done", "message": f"Benchmarked {len(payload['records'])} candidate(s).", "skipped": payload["skipped"]}
        except BenchmarkError as exc:
            with self._lock:
                self._state = {"state": "failed", "message": str(exc)}
        except Exception:  # noqa: BLE001
            log.exception("Benchmark job crashed")
            with self._lock:
                self._state = {"state": "failed", "message": "The benchmark stopped unexpectedly. Details are in the server log."}


JOB = BenchmarkJob()
