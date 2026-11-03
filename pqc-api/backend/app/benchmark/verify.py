"""One real key exchange with the selected mechanism, for the live check in the UI."""
from __future__ import annotations

import hashlib
import time
from typing import Any, Dict

from app.benchmark.engine import BenchmarkError, _load_oqs
from app.config import CANDIDATES


def verify_exchange(mechanism: str) -> Dict[str, Any]:
    oqs, error = _load_oqs()
    if oqs is None:
        raise BenchmarkError("No supported PQC mechanisms were detected in the current cryptographic environment.")
    if mechanism not in CANDIDATES or mechanism not in oqs.get_enabled_kem_mechanisms():
        raise BenchmarkError(f"{mechanism} is not available in the current cryptographic environment.")
    with oqs.KeyEncapsulation(mechanism) as kem:
        t0 = time.perf_counter_ns()
        public_key = kem.generate_keypair()
        t1 = time.perf_counter_ns()
        ciphertext, secret_sent = kem.encap_secret(public_key)
        t2 = time.perf_counter_ns()
        secret_received = kem.decap_secret(ciphertext)
        t3 = time.perf_counter_ns()
    matched = secret_sent == secret_received
    return {
        "mechanism": mechanism,
        "verified": matched,
        "public_key_bytes": len(public_key),
        "ciphertext_bytes": len(ciphertext),
        "shared_secret_bytes": len(secret_sent),
        # Fingerprints only; the secret itself is never returned.
        "sender_fingerprint": hashlib.sha256(secret_sent).hexdigest()[:16],
        "receiver_fingerprint": hashlib.sha256(secret_received).hexdigest()[:16],
        "timing_us": {
            "keygen": round((t1 - t0) / 1000.0, 1),
            "encapsulation": round((t2 - t1) / 1000.0, 1),
            "decapsulation": round((t3 - t2) / 1000.0, 1),
        },
        "note": "Single run for demonstration. Use the benchmark medians, not this timing, for decisions.",
    }
