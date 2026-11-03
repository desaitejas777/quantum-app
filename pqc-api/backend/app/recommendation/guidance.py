"""Practical implementation guidance for the selected option.

Numbers in this text come from the benchmark record of the selected option.
The guidance separates what a demonstration needs from what production needs."""
from __future__ import annotations

from typing import Any, Dict

from app.config import CANDIDATES


def build_guidance(selected: Dict[str, Any]) -> Dict[str, Any]:
    name = selected["mechanism"]
    m = selected["metrics"]
    wire = m["public_key_bytes"] + m["ciphertext_bytes"]
    info = CANDIDATES[name]
    exchange_us = selected["raw"]["speed"]

    considerations = [
        {
            "title": "Message size",
            "text": f"Each key exchange adds about {wire:,} bytes on the network ({m['public_key_bytes']:,} bytes public key and {m['ciphertext_bytes']:,} bytes ciphertext). "
                    "Check any proxy, firewall, or message-size limit between the client and the server.",
        },
        {
            "title": "Storage and memory",
            "text": f"The private key held by the receiving side is {m['secret_key_bytes']:,} bytes. Keep it in memory only for as long as the exchange needs it, and never write it to logs.",
        },
        {
            "title": "Speed",
            "text": f"The measured cryptographic work for one complete exchange is about {exchange_us:,.0f} µs on the benchmark machine. Repeat the measurement on your own servers under realistic load.",
        },
        {
            "title": "Key agreement only",
            "text": f"{name} replaces the key-agreement step (for example ECDH or RSA key transport). It does not encrypt data or sign anything. "
                    "Keep your existing symmetric encryption and authentication, and derive session keys from the shared secret with a standard key-derivation function.",
        },
        {
            "title": "Hybrid during migration",
            "text": "Many organizations combine a classical exchange with the post-quantum one while they migrate, so the connection stays safe if either is later weakened. Plan for this if your stack supports it.",
        },
    ]
    if name.startswith("ML-KEM") and name != "ML-KEM-768":
        considerations.append({
            "title": "Check platform support",
            "text": f"Many current TLS deployments favour ML-KEM-768. Confirm that your server, proxy and client libraries support {name} before standardizing on it.",
        })
    if not info["finalized"]:
        considerations.append({
            "title": "Standardization status",
            "text": f"{name} is not treated as a finalized standard in this tool's reference data. Check the current NIST status before using it for anything beyond evaluation.",
        })

    return {
        "selected": name,
        "flow": [
            "Application or intranet service",
            "Cryptographic abstraction layer",
            f"{name} implementation",
            "Key generation",
            "Encapsulation",
            "Decapsulation",
            "Verification of the shared secret",
        ],
        "where_it_fits": (
            "Place the key exchange behind one small interface used by your application, with three operations: generate a key pair, "
            "encapsulate to a public key, and decapsulate with a private key. The algorithm name then becomes a configuration value rather than something spread through the code."
        ),
        "what_to_change": [
            "Add the cryptographic abstraction layer and move the current key-exchange calls behind it.",
            f"Add {name} as a selectable algorithm in configuration, keeping the current algorithm as a fallback during rollout.",
            "Feed the shared secret into a key-derivation function, then use the derived keys with your existing symmetric encryption.",
            "Update size limits for handshake messages, certificates or configuration files that now carry larger keys.",
            "Record the algorithm name in logs and metrics so you can see which option each connection used.",
        ],
        "considerations": considerations,
        "validation_steps": [
            "Round-trip test: the secret from decapsulation must equal the secret from encapsulation, for many random runs.",
            "Known-answer tests: check the implementation against the published test vectors for the algorithm.",
            "Interoperability test between every client and server version you will run.",
            "Load test with your real traffic pattern, comparing handshake time and error rate with the current setup.",
            "Rollback test: confirm you can switch back to the previous algorithm without downtime.",
            "Monitor handshake failures and latency after release.",
        ],
        "demo_vs_production": [
            {
                "topic": "Implementation",
                "demonstration": "liboqs through its Python binding, as used by this project's benchmark and live check.",
                "production": "A maintained library or platform component that your security team has approved, and a validated module if your regulations require it.",
            },
            {
                "topic": "Testing",
                "demonstration": "Round-trip check and benchmark on one machine.",
                "production": "Known-answer tests, interoperability tests, load tests, and an independent security review.",
            },
            {
                "topic": "Key handling",
                "demonstration": "Keys exist only in memory during the check.",
                "production": "Defined key lifetimes, protected storage, and incident procedures.",
            },
            {
                "topic": "Rollout",
                "demonstration": "Not applicable.",
                "production": "Phased rollout with hybrid mode, monitoring and a tested rollback.",
            },
        ],
        "disclaimer": "This guidance supports evaluation and planning. It is not a certification and does not replace a security review of your deployment.",
    }
