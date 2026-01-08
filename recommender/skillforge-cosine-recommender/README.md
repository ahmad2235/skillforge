# SkillForge Cosine Recommender (Laravel Drop-in)

This folder contains a **drop-in Laravel module** (pure PHP) that implements the content-based **cosine similarity**
recommender we designed for SkillForge.

It follows the business rules you specified:
- Project must be `open`
- `student.domain == project.domain`
- exclude `low-activity`
- **no higher-level students taking low-level projects**: student level must equal the **adjusted required level**
- complexity upgrades minimum required level via `max(project.required_level, complexity_min_level[complexity])`
- `semi-active` allowed only if similarity >= threshold (default 0.80)
- returns **top 7**

## 1) How to install (copy into your Laravel project)

Copy these folders into your Laravel repository root (merge folders):
- `app/Services/Recommendation`
- `app/Http/Controllers/Recommendation`
- `routes/recommendation.php`
- `config/recommendation.php`
- `tests/Feature/Recommendation`
- (optional) `storage/app/recommender/ai_analysis.json` (demo data)

Then register the route file in `routes/api.php`:

```php
require __DIR__.'/recommendation.php';
```

Clear config cache if needed:

```bash
php artisan config:clear
php artisan cache:clear
```

## 2) API endpoint (ready)

After installing, you will have:

`GET /api/projects/{projectId}/candidates`

Query params:
- `top_n` (default 7)
- `semi_active_min_similarity` (default 0.80)

Response:
```json
{
  "project_id": 13,
  "top_n": 7,
  "candidates": [
    {
      "student_id": 5,
      "name": "Ali",
      "domain": "backend",
      "level": "intermediate",
      "activity_profile": "active",
      "similarity": 0.8732
    }
  ]
}
```

## 3) How to connect to your DB models

By default this module includes **repository adapters** that expect you to have:
- `App\Models\Project`
- `App\Models\Student`

If your column names differ, edit:
- `app/Services/Recommendation/Repositories/EloquentProjectRepository.php`
- `app/Services/Recommendation/Repositories/EloquentStudentRepository.php`

The recommender only needs the fields documented in `config/recommendation.php`.

## 4) Run tests

```bash
php artisan test --filter=Recommendation
```

## 5) Demo mode (no DB)

If you want to test quickly with the provided JSON file:
- place `ai_analysis.json` at `storage/app/recommender/ai_analysis.json`
- call:

`GET /api/projects/{projectId}/candidates?source=json`

This uses the JSON repositories instead of Eloquent.

---
If you want to evolve later to embeddings/ML, keep the service boundary:
`RecommendationService::recommendCandidates($projectId, $options)`.
