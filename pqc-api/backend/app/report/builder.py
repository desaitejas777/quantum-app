"""Assessment report: JSON, Markdown, or printable HTML. Contains only data
produced by the assessment (real benchmark records, requirements, scores)."""
from __future__ import annotations

import html
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.config import CRITERIA, CRITERIA_INFO, PRIORITY_LEVELS, SECURITY_LEVELS
from app.recommendation.engine import fmt_bytes, fmt_us
from app.recommendation.guidance import build_guidance


def build_report(assessment: Dict[str, Any]) -> Dict[str, Any]:
    req = assessment["requirements"]
    meta = assessment["data"]["meta"]
    selected = assessment["ranking"][0]
    return {
        "title": "User-Centric ML-KEM Parameter Selection: Assessment Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "requirements": {
            "organization": req["organization_name"] or "Not provided",
            "application": req["application_name"] or "Not provided",
            "application_type": assessment["application_label"],
            "minimum_security": f"Category {req['min_security_category']} ({SECURITY_LEVELS[req['min_security_category']]['label']})",
            "finalized_standards_only": req["finalized_standards_only"],
            "priorities": {CRITERIA_INFO[c]["label"]: PRIORITY_LEVELS[req["priorities"][c]] for c in CRITERIA},
        },
        "weights": {CRITERIA_INFO[c]["label"]: assessment["weights"][c] for c in CRITERIA},
        "candidates": {
            "benchmarked": [r["mechanism"] for r in assessment["data"]["records"]],
            "not_benchmarked": [{"mechanism": r["mechanism"], "status": r["status_text"]} for r in assessment["not_benchmarked"]],
            "excluded_by_requirements": assessment["excluded"],
        },
        "benchmark": {
            "source": meta.get("source"),
            "measured_at": meta.get("generated_at"),
            "library": meta.get("library"),
            "library_version": meta.get("library_version"),
            "trials": meta.get("trials"),
            "environment": meta.get("environment"),
            "records": assessment["data"]["records"],
        },
        "methodology": assessment["method"],
        "ranking": assessment["ranking"],
        "recommendation": assessment["recommendation"],
        "stability": assessment["stability"],
        "limitations": assessment["limitations"],
        "implementation_guidance": build_guidance(selected),
    }


def _rows_ranking(report: Dict[str, Any]) -> List[List[str]]:
    rows = []
    for r in report["ranking"]:
        rows.append([
            str(r["rank"]), r["mechanism"], f"Category {r['security_category']}",
            fmt_us(r["metrics"]["keygen_us"]), fmt_us(r["metrics"]["encapsulation_us"]), fmt_us(r["metrics"]["decapsulation_us"]),
            fmt_bytes(r["metrics"]["public_key_bytes"]), fmt_bytes(r["metrics"]["ciphertext_bytes"]), f"{r['overall_score']:.2f}",
        ])
    return rows


RANK_HEAD = ["Rank", "Option", "Security", "Key generation", "Encapsulation", "Decapsulation", "Public key", "Ciphertext", "Score (/100)"]


def _sections(report: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Neutral structure rendered by both the Markdown and HTML writers."""
    req, g, rec = report["requirements"], report["implementation_guidance"], report["recommendation"]
    bench = report["benchmark"]
    env = bench.get("environment") or {}
    secs: List[Dict[str, Any]] = []
    secs.append({"h": "1. Recommendation", "p": [f"Recommended option: {rec['mechanism']} (score {rec['overall_score']:.2f} / 100).", rec["headline"]],
                 "l": rec["reasons"], "lt": "Why this was selected", "l2": rec["tradeoffs"], "l2t": "Trade-offs"})
    secs.append({"h": "2. Assessment requirements", "kv": [
        ("Organization", req["organization"]), ("Application", req["application"]), ("Application type", req["application_type"]),
        ("Minimum security", req["minimum_security"]), ("Finalized standards only", "Yes" if req["finalized_standards_only"] else "No")]})
    secs.append({"h": "3. Priorities and weights", "table": (["Criterion", "Your priority", "Weight (%)"],
                 [[k, req["priorities"][k], f"{report['weights'][k]:.2f}"] for k in req["priorities"]])})
    cand = report["candidates"]
    lines = [f"Benchmarked: {', '.join(cand['benchmarked'])}."]
    for item in cand["not_benchmarked"]:
        lines.append(f"{item['mechanism']}: {item['status']}. No values are shown for it.")
    for item in cand["excluded_by_requirements"]:
        lines.append(f"{item['mechanism']}: benchmarked but not scored. {' '.join(item['reasons'])}")
    secs.append({"h": "4. Available candidates", "l": lines})
    secs.append({"h": "5. Benchmark results", "kv": [
        ("Source", bench.get("source") or "unknown"), ("Measured at", bench.get("measured_at") or "unknown"),
        ("Library", f"{bench.get('library') or 'unknown'} {bench.get('library_version') or '(version not recorded)'}"),
        ("Trials per option", str(bench.get("trials") or "not recorded")),
        ("Machine", f"{env.get('os') or 'unknown'}, {env.get('cpu') or 'unknown'}, Python {env.get('python_version') or 'unknown'}")],
        "table": (["Option", "Key generation (median)", "Encapsulation (median)", "Decapsulation (median)", "Public key", "Secret key", "Ciphertext"],
                  [[r["mechanism"], fmt_us(r["keygen_us"]["median"]), fmt_us(r["encapsulation_us"]["median"]), fmt_us(r["decapsulation_us"]["median"]),
                    fmt_bytes(r["public_key_bytes"]), fmt_bytes(r["secret_key_bytes"]), fmt_bytes(r["ciphertext_bytes"])] for r in bench["records"]])})
    secs.append({"h": "6. Scoring methodology", "p": [report["methodology"],
                 "Speed uses the sum of the three median operation times. Communication size uses public key plus ciphertext. Resource usage uses public key plus secret key plus ciphertext."]})
    secs.append({"h": "7. Ranking", "table": (RANK_HEAD, _rows_ranking(report))})
    secs.append({"h": "8. Stability across priorities", "table": (["Scenario", "Recommended option", "Score"],
                 [[s["scenario"], s["recommended"], f"{s['overall_score']:.2f}"] for s in report["stability"]])})
    secs.append({"h": "9. Limitations", "l": report["limitations"]})
    secs.append({"h": "10. Implementation guidance", "p": [g["where_it_fits"]], "l": g["what_to_change"], "lt": "What needs to change",
                 "l2": [f"{c['title']}: {c['text']}" for c in g["considerations"]], "l2t": "Integration considerations",
                 "l3": g["validation_steps"], "l3t": "Validation and testing steps",
                 "table": (["Topic", "Demonstration", "Production"], [[d["topic"], d["demonstration"], d["production"]] for d in g["demo_vs_production"]]),
                 "foot": g["disclaimer"]})
    return secs


def to_markdown(report: Dict[str, Any]) -> str:
    out = [f"# {report['title']}", "", f"Generated: {report['generated_at']}", ""]
    for s in _sections(report):
        out += [f"## {s['h']}", ""]
        for p in s.get("p", []):
            out += [p, ""]
        for k, v in s.get("kv", []):
            out.append(f"- **{k}:** {v}")
        if s.get("kv"):
            out.append("")
        for key, title in (("l", "lt"), ("l2", "l2t"), ("l3", "l3t")):
            if s.get(key):
                if s.get(title):
                    out += [f"**{s[title]}**", ""]
                out += [f"{i}. {x}" for i, x in enumerate(s[key], 1)] + [""]
        if s.get("table"):
            head, rows = s["table"]
            out.append("| " + " | ".join(head) + " |")
            out.append("|" + "---|" * len(head))
            out += ["| " + " | ".join(str(c).replace("|", "/") for c in row) + " |" for row in rows] + [""]
        if s.get("foot"):
            out += [f"_{s['foot']}_", ""]
    return "\n".join(out)


CSS = """body{font-family:Segoe UI,Arial,sans-serif;background:#F0F4F8;color:#0F172A;max-width:960px;margin:0 auto;padding:32px 20px;line-height:1.5}
h1{font-size:26px;border-bottom:4px solid #06B6D4;padding-bottom:8px}h2{font-size:19px;margin-top:32px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px}th,td{border:1px solid #0F172A;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#0F172A;color:#F0F4F8}.table-wrap{overflow-x:auto}@media print{body{background:#fff}}"""


def to_html(report: Dict[str, Any]) -> str:
    e = html.escape
    parts = [f"<!doctype html><html lang='en'><head><meta charset='utf-8'><title>{e(report['title'])}</title><style>{CSS}</style></head><body>",
             f"<h1>{e(report['title'])}</h1><p>Generated: {e(report['generated_at'])}</p>"]
    for s in _sections(report):
        parts.append(f"<h2>{e(s['h'])}</h2>")
        parts += [f"<p>{e(p)}</p>" for p in s.get("p", [])]
        if s.get("kv"):
            parts.append("<ul>" + "".join(f"<li><strong>{e(k)}:</strong> {e(str(v))}</li>" for k, v in s["kv"]) + "</ul>")
        for key, title in (("l", "lt"), ("l2", "l2t"), ("l3", "l3t")):
            if s.get(key):
                if s.get(title):
                    parts.append(f"<h3>{e(s[title])}</h3>")
                parts.append("<ol>" + "".join(f"<li>{e(x)}</li>" for x in s[key]) + "</ol>")
        if s.get("table"):
            head, rows = s["table"]
            parts.append("<div class='table-wrap'><table><thead><tr>" + "".join(f"<th>{e(h)}</th>" for h in head) + "</tr></thead><tbody>"
                         + "".join("<tr>" + "".join(f"<td>{e(str(c))}</td>" for c in row) + "</tr>" for row in rows) + "</tbody></table></div>")
        if s.get("foot"):
            parts.append(f"<p><em>{e(s['foot'])}</em></p>")
    parts.append("</body></html>")
    return "".join(parts)
