"""Static configuration and reference data.

Everything in this file is *reference data or configuration*. None of it is
benchmark output. Measured values only ever come from ``benchmark/engine.py``
(live liboqs run) or from a stored result file written by that engine.
"""
from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
# PQC_DATA_DIR lets tests / alternative deployments keep their data elsewhere.
DATA_DIR = Path(os.environ.get("PQC_DATA_DIR", ROOT_DIR / "data"))
BENCHMARK_PATH = DATA_DIR / "benchmark_results.json"

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "PQC_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]

# Benchmark limits (protect the host from accidental huge runs).
MIN_TRIALS = 10
MAX_TRIALS = 5000
DEFAULT_TRIALS = 300
WARMUP_TRIALS = 5

# --------------------------------------------------------------------------
# Candidate catalogue (reference data, NOT measurements).
# liboqs mechanism names. HQC-1/3/5 correspond to the HQC-128/192/256 sets.
# security_category = NIST post-quantum security category (1, 3 or 5).
# --------------------------------------------------------------------------
CANDIDATES = {
    "ML-KEM-512": {"family": "ML-KEM", "security_category": 1, "standard": "NIST FIPS 203 (final)", "finalized": True},
    "ML-KEM-768": {"family": "ML-KEM", "security_category": 3, "standard": "NIST FIPS 203 (final)", "finalized": True},
    "ML-KEM-1024": {"family": "ML-KEM", "security_category": 5, "standard": "NIST FIPS 203 (final)", "finalized": True},
    "HQC-1": {"family": "HQC", "security_category": 1, "standard": "Selected by NIST (2025); standard not treated as final here", "finalized": False},
    "HQC-3": {"family": "HQC", "security_category": 3, "standard": "Selected by NIST (2025); standard not treated as final here", "finalized": False},
    "HQC-5": {"family": "HQC", "security_category": 5, "standard": "Selected by NIST (2025); standard not treated as final here", "finalized": False},
}
CANDIDATE_ORDER = list(CANDIDATES)

SECURITY_LEVELS = {
    1: {"label": "Standard", "description": "Comparable to AES-128 strength. Suitable for most business applications."},
    3: {"label": "Strong", "description": "Comparable to AES-192 strength. Extra margin for sensitive data."},
    5: {"label": "Maximum", "description": "Comparable to AES-256 strength. For the most sensitive, long-lived data."},
}

# --------------------------------------------------------------------------
# Scoring criteria. Weights are expressed as percentages that total 100.
# --------------------------------------------------------------------------
CRITERIA = ["security", "speed", "size", "resources"]

CRITERIA_INFO = {
    "security": {
        "label": "Security strength",
        "help": "Higher NIST security category gives a larger safety margin.",
        "metric": "NIST security category",
        "unit": "category",
        "direction": "higher",
    },
    "speed": {
        "label": "Speed",
        "help": "Time for one complete key exchange (key generation + encapsulation + decapsulation).",
        "metric": "Median exchange time",
        "unit": "µs",
        "direction": "lower",
    },
    "size": {
        "label": "Communication size",
        "help": "Bytes sent over the network per exchange (public key + ciphertext).",
        "metric": "Bytes on the wire",
        "unit": "bytes",
        "direction": "lower",
    },
    "resources": {
        "label": "Resource usage",
        "help": "Key material a device must hold in memory (public key + secret key + ciphertext).",
        "metric": "Key material held",
        "unit": "bytes",
        "direction": "lower",
    },
}

PRIORITY_LEVELS = {0: "Not needed", 1: "Nice to have", 2: "Important", 3: "Critical"}

# Application presets: starting points for the requirement form.
APPLICATION_PRESETS = {
    "intranet_portal": {
        "label": "Intranet portal or web application",
        "description": "Employee-facing web application with many short sessions.",
        "min_security_category": 1,
        "priorities": {"security": 2, "speed": 2, "size": 2, "resources": 1},
    },
    "service_api": {
        "label": "Service-to-service API traffic",
        "description": "Internal services that open many connections per second.",
        "min_security_category": 1,
        "priorities": {"security": 1, "speed": 3, "size": 2, "resources": 1},
    },
    "constrained_device": {
        "label": "Constrained or embedded devices",
        "description": "Devices with limited memory, CPU or bandwidth.",
        "min_security_category": 1,
        "priorities": {"security": 1, "speed": 2, "size": 3, "resources": 3},
    },
    "sensitive_archive": {
        "label": "Long-lived sensitive data",
        "description": "Records that must stay confidential for many years.",
        "min_security_category": 3,
        "priorities": {"security": 3, "speed": 1, "size": 1, "resources": 1},
    },
    "custom": {
        "label": "Custom",
        "description": "Set every priority yourself.",
        "min_security_category": 1,
        "priorities": {"security": 2, "speed": 2, "size": 2, "resources": 2},
    },
}

# Scenarios used for the "how stable is this recommendation" check.
SENSITIVITY_SCENARIOS = {
    "Security first": {"security": 3, "speed": 1, "size": 1, "resources": 1},
    "Speed first": {"security": 1, "speed": 3, "size": 1, "resources": 1},
    "Small messages first": {"security": 1, "speed": 1, "size": 3, "resources": 1},
    "Balanced": {"security": 2, "speed": 2, "size": 2, "resources": 2},
}
