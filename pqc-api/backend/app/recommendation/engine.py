"""Builds a complete, reproducible assessment from requirements + stored benchmarks,
and writes the plain-language explanation."""
from __future__ import annotations

from typing import Any, Dict, List

from app.benchmark.engine import candidate_status, load_stored_results
from app.config import (
    APPLICATION_PRESETS,
    CANDIDATES,
    CRITERIA,
    CRITERIA_INFO,
    PRIORITY_LEVELS,
    SECURITY_LEVELS,
    SENSITIVITY_SCENARIOS,
)
from app.schemas.models import Requirements
from app.scoring.engine import priorities_to_weights, score_candidates, split_eligible

PRIORITY_PHRASE = {
    "security": "strong security",
    "speed": "speed",
    "size": "low communication overhead",
    "resources": "low resource usage",
}


class AssessmentError(Exception):
    """Raised when an assessment cannot be produced. Message is user-safe."""


def fmt_us(value: float) -> str:
    return f"{value / 1000:.1f} ms" if value >= 1000 else f"{value:.0f} µs"


def fmt_bytes(value: float) -> str:
    return f"{int(round(value)):,} bytes"


def _times(ratio: float) -> str:
    return f"{ratio:.1f}x"


def _fact(criterion: str, winner: Dict[str, Any], peers: List[Dict[str, Any]]) -> str:
    value = winner["raw"][criterion]
    score = winner["criterion_scores"][criterion]
    fmt = fmt_us if criterion == "speed" else fmt_bytes
    noun = {
        "speed": "a complete key exchange (generate key, encapsulate, decapsulate)",
        "size": "data sent per exchange (public key plus ciphertext)",
        "resources": "key material held in memory",
    }[criterion]
    if not peers:
        return f"{winner['mechanism']} needs {fmt(value)} for {noun}."
    if score >= 99.99:
        runner = min(peers, key=lambda p: p["raw"][criterion])
        return f"Lowest of the options compared for {noun}: {fmt(value)}, versus {fmt(runner['raw'][criterion])} for {runner['mechanism']}."
    best = min(peers, key=lambda p: p["raw"][criterion])
    return f"{noun.capitalize()}: {fmt(value)}. The best option here, {best['mechanism']}, needs {fmt(best['raw'][criterion])}."


def _compare(winner: Dict[str, Any], other: Dict[str, Any]) -> str:
    w_adv: List[str] = []
    o_adv: List[str] = []
    phrases = {
        "speed": ("is {r} faster", "is {r} faster"),
        "size": ("sends {r} less data per exchange", "sends {r} less data per exchange"),
        "resources": ("holds {r} less key material", "holds {r} less key material"),
    }
    for criterion in ("speed", "size", "resources"):
        w, o = winner["raw"][criterion], other["raw"][criterion]
        if o / w >= 1.05:
            w_adv.append(phrases[criterion][0].format(r=_times(o / w)))
        elif w / o >= 1.05:
            o_adv.append(phrases[criterion][1].format(r=_times(w / o)))
    cw, co = winner["security_category"], other["security_category"]
    if co > cw:
        o_adv.insert(0, f"offers a higher security category ({co} versus {cw})")
    elif cw > co:
        w_adv.insert(0, f"offers a higher security category ({cw} versus {co})")
    if not w_adv and not o_adv:
        return f"{other['mechanism']} is nearly identical to {winner['mechanism']} on every measured criterion."
    text = f"Compared with {other['mechanism']}, {winner['mechanism']} " + (", ".join(w_adv) if w_adv else "has no measured advantage")
    if o_adv:
        text += f"; {other['mechanism']} " + ", ".join(o_adv)
    return text + "."


STRONG = 85.0  # a criterion counts as a strength when the winner scores at least this


def _headline(winner: Dict[str, Any], priorities: Dict[str, int], score: float) -> str:
    wanted = [c for c in CRITERIA if priorities[c] > 0]
    wanted.sort(key=lambda c: (-priorities[c], -winner["criterion_scores"][c], CRITERIA.index(c)))
    strengths = [c for c in wanted if winner["criterion_scores"][c] >= STRONG][:2]
    if strengths:
        focus = " and ".join(PRIORITY_PHRASE[c] for c in strengths)
        why = f"it performs best on what you asked for: {focus}"
    else:
        why = "it gives the best overall balance across your priorities"
    return (
        f"{winner['mechanism']} is recommended because {why}. "
        f"It meets the required security level and scores {score:.0f} out of 100 across your priorities."
    )


def _reasons(winner: Dict[str, Any], peers: List[Dict[str, Any]], req: Requirements, weights: Dict[str, float]) -> List[str]:
    category = winner["security_category"]
    label = SECURITY_LEVELS[category]["label"]
    text = f"Meets the required security level: NIST category {category} ({label})."
    if peers and category > max(p["security_category"] for p in peers):
        text += " This is the highest security category among the options compared."
    reasons = [text]
    others = [c for c in CRITERIA if c != "security" and weights[c] > 0]
    others.sort(key=lambda c: (-(winner["criterion_scores"][c] >= STRONG), -req.priorities[c], -winner["contributions"][c]))
    for criterion in others[:2]:
        level = PRIORITY_LEVELS[req.priorities[criterion]].lower()
        reasons.append(f"{CRITERIA_INFO[criterion]['label']} (you rated this {level}): {_fact(criterion, winner, peers)}")
    return reasons


def _tradeoffs(winner: Dict[str, Any], peers: List[Dict[str, Any]], all_records: List[Dict[str, Any]]) -> List[str]:
    notes = [_compare(winner, other) for other in peers[:2]]
    higher = sorted({r["mechanism"] for r in all_records if r["security_category"] > winner["security_category"]})
    if higher:
        notes.append(
            f"Higher security categories were benchmarked ({', '.join(higher)}). "
            "If the data must stay confidential for many years, raise the required security level and run the comparison again."
        )
    return notes


def _limitations(stored: Dict[str, Any], excluded: List[Dict[str, Any]], not_benchmarked: List[Dict[str, Any]]) -> List[str]:
    meta = stored.get("meta", {})
    env = meta.get("environment") or {}
    out = [
        "Timings measure only the cryptographic operations on one machine"
        + (f" ({env.get('os')}, {env.get('cpu')})" if env.get("cpu") else "")
        + ". Network delay, TLS stack overhead and your own application code are not included.",
        "Scores are relative to the options being compared. Adding or removing an option can change every score.",
        "The recommendation helps you shortlist an option. It is not a security audit or a certification of any product.",
    ]
    if meta.get("trials"):
        out.append(f"Each timing is the median of {meta['trials']} measured runs; the first few runs are discarded as warm-up.")
    if meta.get("source", "").startswith("imported"):
        out.append("These benchmark results come from an earlier run of this project and do not record the liboqs version. Run a new benchmark to refresh them.")
    if not_benchmarked:
        names = ", ".join(r["mechanism"] for r in not_benchmarked)
        out.append(f"Not part of this comparison (no benchmark data in this environment): {names}.")
    for item in excluded:
        out.append(f"{item['mechanism']} was benchmarked but not scored: {' '.join(item['reasons'])}")
    return out


def assess(requirements: Requirements) -> Dict[str, Any]:
    stored = load_stored_results()
    if not stored:
        raise AssessmentError("No benchmark data is available yet. Run a benchmark first.")
    records = stored["records"]
    weights = priorities_to_weights(requirements.priorities)
    eligible, excluded = split_eligible(records, requirements.min_security_category, requirements.finalized_standards_only)
    if not eligible:
        raise AssessmentError(
            "None of the benchmarked options meet your requirements. "
            "Try a lower security level, or allow options that are not yet finalized standards."
        )
    ranked = score_candidates(eligible, weights)
    winner, peers = ranked[0], ranked[1:]

    stability = []
    for name, priorities in SENSITIVITY_SCENARIOS.items():
        scenario = score_candidates(eligible, priorities_to_weights(priorities))
        stability.append({
            "scenario": name,
            "recommended": scenario[0]["mechanism"],
            "overall_score": scenario[0]["overall_score"],
            "same_as_current": scenario[0]["mechanism"] == winner["mechanism"],
        })

    status_rows = candidate_status()
    not_benchmarked = [r for r in status_rows if r["status"] != "benchmarked"]
    recommendation = {
        "mechanism": winner["mechanism"],
        "overall_score": winner["overall_score"],
        "headline": _headline(winner, requirements.priorities, winner["overall_score"]),
        "reasons": _reasons(winner, peers, requirements, weights),
        "tradeoffs": _tradeoffs(winner, peers, records),
        "standard": CANDIDATES[winner["mechanism"]]["standard"],
    }
    return {
        "requirements": requirements.model_dump(),
        "application_label": APPLICATION_PRESETS[requirements.application_type]["label"],
        "weights": weights,
        "criteria": CRITERIA_INFO,
        "data": {
            "meta": stored.get("meta", {}),
            "record_count": len(records),
            "records": records,
        },
        "ranking": ranked,
        "excluded": excluded,
        "not_benchmarked": not_benchmarked,
        "recommendation": recommendation,
        "stability": stability,
        "limitations": _limitations(stored, excluded, not_benchmarked),
        "method": (
            "Each criterion value is compared with the best value among the options scored "
            "(higher-is-better: value / best; lower-is-better: best / value) to give a 0-100 score. "
            "Overall score = sum(weight x criterion score) / 100."
        ),
    }
