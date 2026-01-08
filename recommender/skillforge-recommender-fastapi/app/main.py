import os
import json
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict

from app.recommender_cosine import recommend_students


class Candidate(BaseModel):
    student_id: Any
    name: Optional[str] = None
    domain: Optional[str] = None
    level: Optional[str] = None
    activity_profile: Optional[str] = None
    similarity: float


class CandidatesResponse(BaseModel):
    project_id: int
    top_n: int
    semi_active_min_similarity: float
    candidates: List[Candidate]


app = FastAPI(
    title="SkillForge Recommender API",
    version="1.0.0",
    description="Content-based cosine similarity recommender for SkillForge.",
)


def load_data() -> Dict[str, Any]:
    path = os.getenv("DATA_PATH", "./data/ai_analysis.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"DATA_PATH not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/projects/{project_id}/candidates", response_model=CandidatesResponse)
def project_candidates(
    project_id: int,
    top_n: int = Query(7, ge=1, le=50),
    semi_active_min_similarity: float = Query(0.80, ge=0.0, le=1.0),
):
    try:
        data = load_data()
        candidates = recommend_students(
            data=data,
            project_id=project_id,
            top_n=top_n,
            semi_active_min_similarity=semi_active_min_similarity,
        )
        return {
            "project_id": project_id,
            "top_n": top_n,
            "semi_active_min_similarity": semi_active_min_similarity,
            "candidates": candidates,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
