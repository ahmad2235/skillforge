# 📘 **SkillForge – Backend README (Laravel 12 Modular Monolith)**

## 🚀 Overview

**SkillForge** is an AI-powered tutoring, assessment, and developer-ranking platform.
The backend is built using **Laravel 12** and structured as a **Modular Monolith** with a Clean Architecture approach.
The frontend uses **React 19 + Vite**.

This document describes backend architecture, module structure, AI integration points, development workflow, and best practices for contributors (AI engineer + frontend engineer).

---

# 🏗️ Architecture

The backend is divided into **feature modules**, located in:

```
backend/app/Modules/
```

Each module follows **Clean Architecture / DDD-style layer separation**:

```
Interface/       → Controllers + routes (HTTP boundary)
Application/     → Services, Use-Cases
Domain/          → Entities, value objects, repository ports
Infrastructure/  → Eloquent Models, DB adapters, external API adapters
```

## 📦 Modules

| Module           | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| **Identity**     | Authentication, registration, roles                     |
| **Learning**     | Roadmaps, blocks, tasks, submissions                    |
| **Projects**     | Business projects, assignments, invitations, team logic |
| **Gamification** | Badges, portfolios                                      |
| **Assessment**   | Placement tests, question attempts, placement results   |
| **AI**           | Task evaluation + candidate ranking (integration hooks) |

---

# 🛣️ Routing

Each module exposes its own routes file:

```
app/Modules/<Module>/Interface/routes.php
```

All modules are loaded inside:

```
backend/routes/api.php
```

Example:

```php
require base_path('app/Modules/Identity/Interface/routes.php');
require base_path('app/Modules/Learning/Interface/routes.php');
require base_path('app/Modules/Projects/Interface/routes.php');
require base_path('app/Modules/Gamification/Interface/routes.php');
require base_path('app/Modules/Assessment/Interface/routes.php');
```

---

# 🔐 Authentication & Authorization

**Laravel Sanctum** is used for authentication.

### Middleware standards:

| Middleware      | Purpose                     |
| --------------- | --------------------------- |
| `auth:sanctum`  | Ensure token authentication |
| `role:student`  | Only student users          |
| `role:business` | Business owners             |
| `role:admin`    | Admin panel                 |

### RoleMiddleware

Located at:

```
backend/app/Http/Middleware/RoleMiddleware.php
```

---

# 📚 API Conventions

* Always return **JSON**
* Use proper status codes:

  * **200** OK
  * **201** Created
  * **403** Forbidden
  * **422** Validation error
* Use REST naming conventions:

  * `/auth/...`
  * `/student/...`
  * `/business/...`
  * `/admin/...`

---

# 🤖 AI Module — Integration Points

All AI logic lives under:

```
app/Modules/AI/Application/Services/
```

There are **two official entry points** the AI engineer uses:

---

## 1️⃣ TaskEvaluationService

File:

```
app/Modules/AI/Application/Services/TaskEvaluationService.php
```

Purpose:
Score a student’s task submission, generate feedback, and return metadata.

### Contract (must stay stable):

```php
evaluateSubmission(Submission $submission): array

// returns:
[
  'score'    => int|null,      // 0–100
  'feedback' => string|null,   // short feedback for student
  'metadata' => array,          // additional info
]
```

### When it is called?

Inside:

```
RoadmapService::submitTask()
```

After saving a Submission to DB.

---

## 2️⃣ RecommendationService

File:

```
app/Modules/AI/Application/Services/RecommendationService.php
```

Purpose:
Rank candidate students for a business project.

### Contract (must stay stable):

```php
rankCandidates(Project $project, Collection $candidates): array

// returns:
[
  [
    'student' => User,     // model instance
    'score'   => int,      // ranking score
    'reason'  => string    // explanation (later: AI reason)
  ],
  ...
]
```

### Where used?

Inside:

```
OwnerProjectAssignmentController::candidates()
```

---

# 🧩 Key Backend Files

| File                                             | Purpose                                   |
| ------------------------------------------------ | ----------------------------------------- |
| `backend/composer.json`                          | Composer scripts (`setup`, `dev`, `test`) |
| `backend/bootstrap/app.php`                      | Middleware + routing config               |
| `backend/routes/api.php`                         | Loads all module routes                   |
| `backend/app/Models/User.php`                    | User model: role, level, domain           |
| `backend/app/Http/Middleware/RoleMiddleware.php` | Role authorization                        |

---

# 🛠️ Development Workflow

## 📦 Backend (Laravel)

```bash
cd backend

composer setup   # install deps, migrate, seed
composer dev     # runs server + queue + logs + vite
composer test    # run PHPUnit tests
```

### Manual commands:

```bash
php artisan migrate
php artisan serve
php artisan test
```

### Cache clearing (important):

```bash
php artisan route:clear
php artisan config:clear
php artisan optimize:clear
```

---

## 💻 Frontend (React 19 + Vite)

```bash
cd frontend
npm install
npm run dev
```

---

# 🧱 Adding a New Feature

When adding anything new, follow this sequence:

---

### 1️⃣ Create Controller

Location:

```
app/Modules/<Module>/Interface/Http/Controllers/
```

---

### 2️⃣ Register Routes

Location:

```
app/Modules/<Module>/Interface/routes.php
```

Add route group:

```php
Route::middleware(['auth:sanctum', 'role:student'])
```

or

```php
Route::middleware(['auth:sanctum', 'role:business'])
```

---

### 3️⃣ Add an Application Service (if needed)

Location:

```
app/Modules/<Module>/Application/Services/
```

Business logic goes here.

---

### 4️⃣ Use Infrastructure Models for DB access

Location:

```
app/Modules/<Module>/Infrastructure/Models/
```

---

### 5️⃣ Run migration (if applicable)

```bash
php artisan make:migration create_example_table
php artisan migrate
```

---

# 🗄️ Database Notes

Enums:

* `role`: `student`, `business`, `admin`
* `level`: `beginner`, `intermediate`, `advanced`
* `domain`: `frontend`, `backend`

⚠️ Important:
Column names **must** match the migrations.
If the code uses a field not in your migration (`answer_text` vs `answer`), update the code accordingly.

---

# 🧪 Testing

Tests live in:

```
backend/tests/Feature/
backend/tests/Unit/
```

Run:

```bash
composer test
# or
php artisan test
```

Thunder Client/Postman recommended for API debugging.

---

# 🌍 Localization

* Some comments in Arabic are intentional for maintainers.
* Feel free to add localized docs under `/docs`.

---

# ✔️ Summary

SkillForge backend is structured for:

* Clean module boundaries
* Easy AI integration
* Simple frontend consumption
* Team-friendly code organization
* High scalability (modular monolith → potential microservices later)

**AI engineer** touches only:

* `TaskEvaluationService`
* `RecommendationService`
* Optional: add AiLog, prompt templates

**Frontend engineer** relies on:

* stable JSON contracts from `/student/*`, `/business/*`, `/auth/*`, `/projects/*`, `/assessment/*`

**Backend team** works inside Modules with strict boundaries.


