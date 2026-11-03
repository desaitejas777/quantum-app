"""Weighted decision scoring.

Method (documented in docs/scoring-methodology.md):

  1. Candidates that do not meet the hard requirements are excluded.
  2. For each criterion one raw value is taken from the benchmark record.
  3. Each raw value becomes a 0-100 score by comparing it with the best value
     among the candidates being scored ("ratio to best"):
        higher is better:  score = 100 * value / best_value
        lower  is better:  score = 100 * best_value / value
  4. Overall score = sum(weight_i * score_i) / 100, weights total 100.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Tuple

from app.config import CANDIDATES, CRITERIA, CRITERIA_INFO

WEIGHT_TOLERANCE = 0.01


def priorities_to_weights(priorities: Dict[str, int]) -> Dict[str, float]:
    """Turn 0-3 priority levels into percentage weights totalling exactly 100."""
    if set(priorities) != set(CRITERIA):
        raise ValueError("Priorities must be given for: " + ", ".join(CRITERIA))
    total = sum(priorities.values())
    if total <= 0 or any(p < 0 for p in priorities.values()):
        raise ValueError("Choose at least one thing that matters to your application.")
    weights = {key: round(priorities[key] * 100.0 / total, 2) for key in CRITERIA}
    # absorb rounding drift in the largest weight so the total is exactly 100
    drift = round(100.0 - sum(weights.values()), 2)
    largest = max(CRITERIA, key=lambda k: weights[k])
    weights[largest] = round(weights[largest] + drift, 2)
    return weights


def validate_weights(weights: Dict[str, Any]) -> Dict[str, float]:
    if not isinstance(weights, dict):
        raise ValueError("Weights must be a mapping of criterion to percentage.")
    missing = [k for k in CRITERIA if k not in weights]
    extra = [k for k in weights if k not in CRITERIA]
    if missing or extra:
        raise ValueError(f"Weights must be set for exactly: {', '.join(CRITERIA)}.")
    cleaned: Dict[str, float] = {}
    for key in CRITERIA:
        try:
            value = float(weights[key])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Weight for {key} must be a number.") from exc
        if value != value or value < 0 or value > 100:
            raise ValueError(f"Weight for {key} must be between 0 and 100.")
        cleaned[key] = value
    if abs(sum(cleaned.values()) - 100.0) > WEIGHT_TOLERANCE:
        raise ValueError("Weights must total 100%.")
    return cleaned


def normalize(values: Iterable[float], lower_is_better: bool) -> List[float]:
    """Ratio-to-best normalization, returns scores in (0, 1]. All inputs must be > 0."""
    items = list(values)
    if not items:
        return []
    if any(not isinstance(v, (int, float)) or v <= 0 or v != v for v in items):
        raise ValueError("Benchmark values must be positive numbers.")
    if lower_is_better:
        best = min(items)
        return [best / v for v in items]
    best = max(items)
    return [v / best for v in items]


def criterion_values(record: Dict[str, Any]) -> Dict[str, float]:
    """The single raw number used for each criterion."""
    speed = sum(record[f]["median"] for f in ("keygen_us", "encapsulation_us", "decapsulation_us"))
    return {
        "security": float(record["security_category"]),
        "speed": float(speed),
        "size": float(record["public_key_bytes"] + record["ciphertext_bytes"]),
        "resources": float(record["public_key_bytes"] + record["secret_key_bytes"] + record["ciphertext_bytes"]),
    }


def split_eligible(
    records: List[Dict[str, Any]], min_security_category: int, finalized_only: bool
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    eligible, excluded = [], []
    for record in records:
        name = record["mechanism"]
        reasons = []
        if record["security_category"] < min_security_category:
            reasons.append(f"Security category {record['security_category']} is below the required category {min_security_category}.")
        if finalized_only and not CANDIDATES[name]["finalized"]:
            reasons.append("Not a finalized standard, and you chose to use finalized standards only.")
        if reasons:
            excluded.append({"mechanism": name, "reasons": reasons})
        else:
            eligible.append(record)
    return eligible, excluded


def score_candidates(records: List[Dict[str, Any]], weights: Dict[str, float]) -> List[Dict[str, Any]]:
    """Score and rank already-eligible records. Fully deterministic."""
    weights = validate_weights(weights)
    if not records:
        return []
    raw = {r["mechanism"]: criterion_values(r) for r in records}
    names = [r["mechanism"] for r in records]
    scores: Dict[str, Dict[str, float]] = {n: {} for n in names}
    for criterion in CRITERIA:
        lower = CRITERIA_INFO[criterion]["direction"] == "lower"
        normalized = normalize([raw[n][criterion] for n in names], lower_is_better=lower)
        for name, value in zip(names, normalized, strict=True):
            scores[name][criterion] = value * 100.0

    ranked = []
    for record in records:
        name = record["mechanism"]
        contributions = {c: weights[c] * scores[name][c] / 100.0 for c in CRITERIA}
        overall = sum(contributions.values())
        ranked.append({
            "mechanism": name,
            "family": record["family"],
            "security_category": record["security_category"],
            "overall_score": round(overall, 2),
            "_sort": overall,
            "raw": raw[name],
            "criterion_scores": {c: round(scores[name][c], 2) for c in CRITERIA},
            "contributions": {c: round(contributions[c], 2) for c in CRITERIA},
            "metrics": {
                "keygen_us": record["keygen_us"]["median"],
                "encapsulation_us": record["encapsulation_us"]["median"],
                "decapsulation_us": record["decapsulation_us"]["median"],
                "public_key_bytes": record["public_key_bytes"],
                "secret_key_bytes": record["secret_key_bytes"],
                "ciphertext_bytes": record["ciphertext_bytes"],
            },
        })
    # tie-break: higher security, then smaller exchange, then name (deterministic)
    ranked.sort(key=lambda r: (-round(r["_sort"], 9), -r["security_category"], r["raw"]["size"], r["mechanism"]))
    for position, item in enumerate(ranked, start=1):
        item["rank"] = position
        del item["_sort"]
    return ranked
