# SkillForge Python Recommender + FastAPI

This folder contains:
- `app/recommender_cosine.py` — your cosine-similarity recommender logic (source of truth)
- `app/main.py` — FastAPI wrapper exposing a simple HTTP endpoint for Laravel
- `data/ai_analysis.json` — demo dataset
- Docker + docker-compose for easy deployment

## Quick start (local)

```bash
pip install -r requirements.txt
export DATA_PATH=./data/ai_analysis.json
uvicorn app.main:app --reload --port 8000
```

Test:
- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/projects/13/candidates?top_n=7&semi_active_min_similarity=0.80

## Run with Docker

```bash
docker build -t skillforge-recommender .
docker run -p 8000:8000 skillforge-recommender
```

or

```bash
docker compose up --build
```

## Laravel integration

See `laravel_integration.md`.

## Notes
- This service currently reads a JSON dataset from `DATA_PATH`. In production you can:
  1) keep it reading a periodically exported JSON from DB, or
  2) extend the API to accept project+students payload, or
  3) connect directly to the DB (not recommended for separation).
