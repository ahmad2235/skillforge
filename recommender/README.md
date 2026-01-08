# SkillForge: Laravel + FastAPI Recommender (Full Handoff Package)

This package contains **two deliverables**:
1) `skillforge-cosine-recommender/`  -> Laravel (PHP) integration module (endpoint + service + demo mode)
2) `skillforge-recommender-fastapi/` -> Python FastAPI microservice (your cosine recommender as an HTTP API)

## Recommended production architecture
- Laravel is the main backend.
- Laravel calls the recommender over HTTP:
  `GET http://recommender:8000/projects/{projectId}/candidates?...`

---
## A) Run the FastAPI recommender (Docker)
From `skillforge-recommender-fastapi/`:

```bash
docker compose up --build
```

Health:
- http://localhost:8000/health

Candidates:
- http://localhost:8000/projects/13/candidates?top_n=7&semi_active_min_similarity=0.80

> Note: project_id must exist in `data/ai_analysis.json`

---
## B) Install the Laravel module into your Laravel repo
Copy these from `skillforge-cosine-recommender/` into your Laravel project root (merge folders):
- `app/Services/Recommendation`
- `app/Http/Controllers/Recommendation`
- `routes/recommendation.php`
- `config/recommendation.php`
- `tests/Feature/Recommendation`
- (optional) `storage/app/recommender/ai_analysis.json`

Register route file in `routes/api.php`:
```php
require __DIR__.'/recommendation.php';
```

---
## C) Connect Laravel to FastAPI (HTTP client)
In Laravel `.env`:
```
RECOMMENDER_BASE_URL=http://localhost:8000
```

In `config/services.php`:
```php
'recommender' => [
  'base_url' => env('RECOMMENDER_BASE_URL', 'http://localhost:8000'),
],
```

See `integration/` for copy-paste code.

---
## D) Verify everything works
1) Start FastAPI via docker compose, check `/health` returns `{"status":"ok"}`
2) Call FastAPI candidates endpoint and confirm it returns JSON candidates.
3) In Laravel, run:
```bash
php artisan test --filter=RecommendationEndpointTest
```
4) From Laravel, call your own endpoint:
   `GET /api/projects/{id}/candidates`

---
## Choose ONE source of truth in production
- Option 1: Laravel computes recommendations internally (PHP engine)
- Option 2: Laravel delegates to FastAPI (Python engine) ✅ recommended if AI logic must stay in Python
