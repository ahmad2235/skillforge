import math
from typing import Dict, Any, List


LEVEL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}
LEVEL_TO_NUM = {"beginner": 0.0, "intermediate": 0.5, "advanced": 1.0}
ACTIVITY_TO_NUM = {"low-activity": 0.0, "semi-active": 0.5, "active": 1.0}

COMPLEXITY_MIN_LEVEL = {
    "low": "beginner",
    "medium": "intermediate",
    "high": "advanced",
}


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = 0.0
    na = 0.0
    nb = 0.0
    n = min(len(a), len(b))
    for i in range(n):
        x = float(a[i])
        y = float(b[i])
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def adjusted_required_level(project: Dict[str, Any]) -> str:
    req = project.get("required_level", "beginner")
    comp = project.get("complexity", "low")
    min_level = COMPLEXITY_MIN_LEVEL.get(comp, "beginner")
    return req if LEVEL_ORDER.get(req, 0) >= LEVEL_ORDER.get(min_level, 0) else min_level


def avg_score_midpoint(score_range: List[int]) -> float:
    if not score_range or len(score_range) != 2:
        return 0.0
    return (float(score_range[0]) + float(score_range[1])) / 2.0


def one_hot(value: str, vocab: List[str]) -> List[float]:
    return [1.0 if value == v else 0.0 for v in vocab]


def student_vector(student: Dict[str, Any], domain_vocab: List[str]) -> List[float]:
    ps = student.get("profile_settings", {}) or {}
    skill = avg_score_midpoint(ps.get("avg_score_range", [])) / 100.0
    weight = float(ps.get("weight", 0.0) or 0.0)

    return (
        one_hot(str(student.get("domain", "")), domain_vocab)
        + [
            LEVEL_TO_NUM.get(str(student.get("level", "beginner")), 0.0),
            ACTIVITY_TO_NUM.get(str(student.get("activity_profile", "low-activity")), 0.0),
            max(0.0, min(1.0, skill)),
            max(0.0, min(1.0, weight)),
        ]
    )


def project_vector(project: Dict[str, Any], domain_vocab: List[str]) -> List[float]:
    needed = adjusted_required_level(project)

    expected_skill = {
        "beginner": 0.55,
        "intermediate": 0.75,
        "advanced": 0.90,
    }.get(needed, 0.55)

    return (
        one_hot(str(project.get("domain", "")), domain_vocab)
        + [
            LEVEL_TO_NUM.get(needed, 0.0),
            1.0,  # prefer active students
            expected_skill,
            1.0,  # reliability always valued
        ]
    )


def eligible(student: Dict[str, Any], project: Dict[str, Any]) -> bool:
    if str(project.get("status")) != "open":
        return False
    if str(student.get("domain")) != str(project.get("domain")):
        return False
    if str(student.get("activity_profile", "low-activity")) == "low-activity":
        return False

    needed = adjusted_required_level(project)
    return str(student.get("level")) == needed


def recommend_students(
    data: Dict[str, Any],
    project_id: int,
    top_n: int = 7,
    semi_active_min_similarity: float = 0.80,
) -> List[Dict[str, Any]]:
    projects = (data.get("entities", {}) or {}).get("projects", []) or []
    students = (data.get("entities", {}) or {}).get("students", []) or []

    project = next((p for p in projects if int(p.get("id", -1)) == int(project_id)), None)
    if project is None:
        raise ValueError(f"Project with id={project_id} not found")

    domain_vocab = sorted({str(p.get("domain", "")) for p in projects} | {str(s.get("domain", "")) for s in students})
    pv = project_vector(project, domain_vocab)

    results: List[Dict[str, Any]] = []
    for s in students:
        if not eligible(s, project):
            continue

        sv = student_vector(s, domain_vocab)
        sim = cosine_similarity(sv, pv)

        activity = str(s.get("activity_profile", "low-activity"))
        if activity == "semi-active" and sim < semi_active_min_similarity:
            continue

        results.append(
            {
                "student_id": s.get("id"),
                "name": s.get("name"),
                "domain": s.get("domain"),
                "level": s.get("level"),
                "activity_profile": activity,
                "similarity": round(float(sim), 4),
            }
        )

    results.sort(key=lambda x: (x["similarity"], 1 if x["activity_profile"] == "active" else 0), reverse=True)
    return results[: max(0, int(top_n))]
