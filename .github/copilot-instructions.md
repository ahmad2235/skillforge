# SkillForge – Copilot Instructions

## Project Overview

SkillForge is an AI tutoring and programmer ranking platform (Laravel 12 API backend + React 19/Vite frontend).

## Architecture

- **Modular Monolith**: Backend organized into feature **Modules** in `backend/app/Modules/`.
  Each module uses **Domain-Driven / Clean Architecture** layers:

  - `Interface/` – routes, controllers, requests (HTTP boundary)
  - `Application/` – services, use-cases
  - `Domain/` – entities, value objects, repository interfaces
  - `Infrastructure/` – Eloquent models, external adapters

- **Modules**: `Identity` (auth), `Learning` (roadmaps, tasks, submissions), `Projects` (business assignments), `Gamification` (badges, portfolios), `Assessment` (placement tests), `AI` (evaluation & recommendation hooks).

- **Routes loading**: Each module exposes `Interface/routes.php`, required from `routes/api.php`:
  ```php
  require base_path('app/Modules/Identity/Interface/routes.php');
  ```

## Conventions & Patterns

| Area               | Convention                                                         |
| ------------------ | ------------------------------------------------------------------ |
| **Namespace**      | `App\Modules\{Module}\{Layer}\...`                                 |
| **Controllers**    | `Interface/Http/Controllers/`                                      |
| **Auth**           | Laravel Sanctum (`auth:sanctum` middleware)                        |
| **Roles**          | `role:student`, `role:business`, `role:admin` via `RoleMiddleware` |
| **Route prefixes** | `/auth`, `/student`, `/admin`, `/business`                         |
| **API responses**  | JSON; status codes 200/201/403/422                                 |

## AI Module – Integration Points

AI services live in `app/Modules/AI/Application/Services/` and are injected into other modules:

| Service                 | Purpose                              | Consumers                                        |
| ----------------------- | ------------------------------------ | ------------------------------------------------ |
| `TaskEvaluationService` | Score student submissions via AI     | `RoadmapService::submitTask()`                   |
| `RecommendationService` | Rank candidate students for projects | `OwnerProjectAssignmentController::candidates()` |

**Return contracts (keep stable):**

```php
// TaskEvaluationService::evaluateSubmission(Submission $s): array
['score' => int|null, 'feedback' => string|null, 'metadata' => array]

// RecommendationService::rankCandidates(Project $p, Collection $candidates): array
[['student' => User, 'score' => int, 'reason' => string], ...]
```

## Key Files & Entry Points

- `backend/composer.json` – custom scripts (`setup`, `dev`, `test`)
- `backend/routes/api.php` – loads all module routes
- `backend/app/Http/Middleware/RoleMiddleware.php` – role gate
- `backend/app/Models/User.php` – user model (`role`, `level`, `domain`)

## Development Workflow

```powershell
# Backend (Laravel)
cd backend
composer setup   # install deps, migrate, build assets
composer dev     # server + queue + pail logs + vite in parallel
composer test    # PHPUnit tests

# Frontend (React)
cd frontend
npm install
npm run dev      # Vite dev server
```

## Adding a New Feature

1. Create controller in `app/Modules/<Module>/Interface/Http/Controllers/`.
2. Register routes in `app/Modules/<Module>/Interface/routes.php`.
3. Add service in `Application/Services/` if business logic is needed.
4. Protect routes with `auth:sanctum` and `role:<role>` middleware.

## Database Notes

- Enums: `role` (student, business, admin), `level` (beginner, intermediate, advanced), `domain` (frontend, backend).
- Migrations in `database/migrations/`; run `php artisan migrate`.
- Column names must match migrations exactly—check before inserting (e.g., `answer_text` not `answer`).

## Testing

- Tests live in `backend/tests/Feature/` and `backend/tests/Unit/`.
- Run via `composer test` or `php artisan test`.

## Misc

- Some comments in Arabic—intentional for maintainer's locale.
- Always clear caches after route/config changes: `php artisan route:clear; php artisan config:clear`.
