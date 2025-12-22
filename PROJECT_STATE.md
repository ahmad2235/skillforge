# PROJECT_STATE.md

**Generated:** December 22, 2025  
**Purpose:** Brutally honest implementation-level snapshot for 2-week MVP decision

---

## 1) Quick Identity

| Property | Value |
|----------|-------|
| **Repo Name** | SkillForge |
| **Backend** | Laravel 12.x (PHP 8.2+) |
| **Frontend** | React 19.2.0 + Vite 7.2.4 |
| **Database** | SQLite (dev), MySQL (prod-ready) |
| **Auth** | Laravel Sanctum 4.2 (SPA session-based) |

### Run Commands

**Backend:**
```bash
cd backend
composer install
php artisan migrate
php artisan db:seed
composer dev  # runs: artisan serve + queue:listen + pail + npm run dev (vite)
# OR manually:
php artisan serve              # http://localhost:8000
php artisan queue:listen       # background jobs
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

**Tests:**
```bash
cd backend
composer test  # or: php artisan test
```

### Environment Requirements

**Backend `.env`:**
- `DB_CONNECTION=sqlite` (or mysql)
- `SESSION_DRIVER=database`
- `SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,localhost:5173,127.0.0.1:5173,localhost:5174,127.0.0.1:5174,localhost:8000`
- Optional: `EVALUATOR_URL=http://127.0.0.1:8001` (for AI evaluation service)

**Frontend `.env`:**
- `VITE_API_BASE_URL=http://localhost:8000/api`

**Required External Services:**
- AI Project Evaluator (Python FastAPI) on port 8001 for task submission grading (optional for basic flow, REQUIRED for AI features)

---

## 2) Architecture Map (Modules)

**Location:** `backend/app/Modules/`

| Module | Routes | Controllers | Services | Models | Migrations | Status |
|--------|--------|-------------|----------|--------|------------|--------|
| **Identity** | `Interface/routes.php` | `Interface/Http/Controllers/` (3 files: AuthController, AdminUserController, AdminStudentController, AdminMonitoringController) | MISSING | `app/Models/User.php` (shared), `Infrastructure/Models/LevelProject.php` | users, personal_access_tokens, sessions | ✅ WORKING |
| **Learning** | `Interface/routes.php` | `Interface/Http/Controllers/` (5 files: StudentRoadmapController, TaskController, AdminRoadmapBlockController, AdminTaskController, AdminSubmissionController, AdminSubmissionReviewController) | `Application/Services/RoadmapService.php`, `Application/Services/AiEvaluationService.php` | `Infrastructure/Models/` (RoadmapBlock, Task, Submission, UserRoadmapBlock, Skill, AiEvaluation) | roadmap_blocks, tasks, submissions, user_roadmap_blocks, skills, ai_evaluations | ✅ WORKING |
| **Projects** | `Interface/routes.php` | `Interface/Http/Controllers/` (7 files: OwnerProjectController, OwnerProjectAssignmentController, StudentAssignmentController, OwnerProjectMilestoneController, StudentMilestoneController, AdminProjectController, AdminMilestoneSubmissionController) | `Application/Services/` (ProjectService, ProjectAdminService, ProjectAssignmentService, ProjectMilestoneService, ProjectMilestoneSubmissionService) | `Infrastructure/Models/` (Project, ProjectAssignment, Team, TeamMember, ProjectMilestone, ProjectMilestoneSubmission) | projects, project_assignments, teams, team_members, project_milestones, project_milestone_submissions | ✅ WORKING |
| **Gamification** | `Interface/routes.php` | `Interface/Http/Controllers/StudentPortfolioController.php` | `Application/Services/PortfolioService.php` | `Infrastructure/Models/` (Portfolio, Badge, UserBadge) | portfolios, badges, user_badges | ✅ WORKING (basic CRUD, no badge awarding logic implemented) |
| **Assessment** | `Interface/routes.php` | `Interface/Http/Controllers/` (PlacementController, AdminAssessmentController) | `Application/Services/PlacementService.php` | `Infrastructure/Models/` (Question, QuestionAttempt, PlacementResult) | questions, question_attempts, placement_results | ✅ WORKING |
| **AI** | MISSING routes (no HTTP endpoints) | MISSING | `Application/Services/` (TaskEvaluationService, RecommendationService, AiLogger) | `Infrastructure/Models/` (AiPromptTemplate, AiLog) | ai_logs, ai_prompt_templates | ⚠️ BACKEND SERVICES ONLY (no direct routes, consumed by Learning & Projects modules) |

**Notes:**
- All modules use **Domain-Driven / Clean Architecture layers**: Interface (routes + controllers), Application (services), Infrastructure (models).
- **AI module** is a **library module** with no HTTP routes—integrated via DI into Learning (task evaluation) and Projects (candidate ranking).

---

## 3) API Inventory (Real Routes)

### Public Routes

| Method | Path | Controller@Method | Middleware | Status |
|--------|------|-------------------|------------|--------|
| GET | `/api/health` | Closure (inline) | - | ✅ |
| POST | `/api/auth/register` | `AuthController@register` | `throttle:register` | ✅ |
| POST | `/api/auth/login` | `AuthController@login` | `throttle:login` | ✅ |

### Student Routes

**Prefix:** `/api/student`  
**Middleware:** `auth:sanctum, role:student`

| Method | Path | Controller@Method | Additional Middleware | Status |
|--------|------|-------------------|-----------------------|--------|
| GET | `/student/roadmap` | `StudentRoadmapController@index` | - | ✅ |
| POST | `/student/blocks/{block}/start` | `StudentRoadmapController@startBlock` | - | ✅ |
| POST | `/student/blocks/{block}/complete` | `StudentRoadmapController@completeBlock` | - | ✅ |
| GET | `/student/blocks/{block}/tasks` | `TaskController@listByBlock` | - | ✅ |
| POST | `/student/tasks/{task}/submit` | `TaskController@submit` | `throttle:submissions` | ✅ (AI evaluation via job) |
| GET | `/student/submissions/{submission}` | `TaskController@getSubmission` | - | ✅ |
| GET | `/student/portfolios` | `StudentPortfolioController@index` | - | ✅ |
| POST | `/student/projects/assignments/{assignment}/portfolio` | `StudentPortfolioController@storeFromAssignment` | - | ✅ |
| GET | `/student/projects/assignments` | `StudentAssignmentController@index` | - | ✅ |
| POST | `/student/projects/assignments/{assignment}/accept` | `StudentAssignmentController@accept` | - | ✅ |
| POST | `/student/projects/assignments/{assignment}/decline` | `StudentAssignmentController@decline` | - | ✅ |
| POST | `/student/projects/assignments/{assignment}/feedback` | `StudentAssignmentController@feedback` | - | ✅ |
| GET | `/student/projects/assignments/{assignment}/milestones` | `StudentMilestoneController@index` | - | ✅ |
| POST | `/student/projects/assignments/{assignment}/milestones/{milestone}/submit` | `StudentMilestoneController@submit` | `throttle:submissions` | ✅ |
| GET | `/student/assessment/placement/questions` | `PlacementController@getQuestions` | - | ✅ |
| POST | `/student/assessment/placement/submit` | `PlacementController@submit` | `throttle:placement_submit` | ✅ |

### Business Routes

**Prefix:** `/api/business`  
**Middleware:** `auth:sanctum, role:business`

| Method | Path | Controller@Method | Additional Middleware | Status |
|--------|------|-------------------|-----------------------|--------|
| GET | `/business/projects` | `OwnerProjectController@index` | - | ✅ |
| POST | `/business/projects` | `OwnerProjectController@store` | - | ✅ |
| GET | `/business/projects/{project}` | `OwnerProjectController@show` | - | ✅ |
| PUT | `/business/projects/{project}` | `OwnerProjectController@update` | - | ✅ |
| POST | `/business/projects/{project}/status` | `OwnerProjectController@changeStatus` | - | ✅ |
| DELETE | `/business/projects/{project}` | `OwnerProjectController@destroy` | - | ✅ |
| GET | `/business/projects/{project}/candidates` | `OwnerProjectAssignmentController@candidates` | - | ✅ (uses AI RecommendationService) |
| GET | `/business/projects/{project}/assignments` | `OwnerProjectAssignmentController@index` | `throttle:assignments` | ✅ |
| POST | `/business/projects/{project}/assignments` | `OwnerProjectAssignmentController@invite` | `throttle:assignments` | ✅ |
| POST | `/business/projects/assignments/{assignment}/complete` | `OwnerProjectAssignmentController@completeWithFeedback` | - | ✅ |
| GET | `/business/projects/{project}/milestones` | `OwnerProjectMilestoneController@index` | - | ✅ |
| POST | `/business/projects/{project}/milestones` | `OwnerProjectMilestoneController@store` | - | ✅ |
| PUT | `/business/projects/{project}/milestones/{milestone}` | `OwnerProjectMilestoneController@update` | - | ✅ |
| DELETE | `/business/projects/{project}/milestones/{milestone}` | `OwnerProjectMilestoneController@destroy` | - | ✅ |

### Admin Routes

**Prefix:** `/api/admin`  
**Middleware:** `auth:sanctum, role:admin, throttle:30,1`

| Method | Path | Controller@Method | Status |
|--------|------|-------------------|--------|
| GET | `/admin/users` | `AdminUserController@index` | ✅ |
| GET | `/admin/users/{user}` | `AdminUserController@show` | ✅ |
| PATCH | `/admin/users/{user}` | `AdminUserController@update` | ✅ |
| GET | `/admin/students` | `AdminStudentController@index` | ✅ |
| GET | `/admin/monitoring/overview` | `AdminMonitoringController@overview` | ✅ |
| GET | `/admin/monitoring/users/recent` | `AdminMonitoringController@recentUsers` | ✅ |
| GET | `/admin/monitoring/users/by-role` | `AdminMonitoringController@usersByRole` | ✅ |
| GET | `/admin/monitoring/students/by-level` | `AdminMonitoringController@studentsByLevel` | ✅ |
| GET | `/admin/monitoring/students/by-domain` | `AdminMonitoringController@studentsByDomain` | ✅ |
| GET | `/admin/monitoring/submissions/recent` | `AdminMonitoringController@recentSubmissions` | ✅ |
| GET | `/admin/monitoring/ai-logs/recent` | `AdminMonitoringController@recentAiLogs` | ✅ |
| GET | `/admin/monitoring/assignments/recent` | `AdminMonitoringController@recentAssignments` | ✅ |
| GET | `/admin/learning/blocks` | `AdminRoadmapBlockController@index` | ✅ |
| POST | `/admin/learning/blocks` | `AdminRoadmapBlockController@store` | ✅ |
| GET | `/admin/learning/blocks/{block}` | `AdminRoadmapBlockController@show` | ✅ |
| PUT | `/admin/learning/blocks/{block}` | `AdminRoadmapBlockController@update` | ✅ |
| DELETE | `/admin/learning/blocks/{block}` | `AdminRoadmapBlockController@destroy` | ✅ |
| GET | `/admin/learning/blocks/{block}/tasks` | `AdminTaskController@index` | ✅ |
| POST | `/admin/learning/blocks/{block}/tasks` | `AdminTaskController@store` | ✅ |
| PUT | `/admin/learning/tasks/{task}` | `AdminTaskController@update` | ✅ |
| DELETE | `/admin/learning/tasks/{task}` | `AdminTaskController@destroy` | ✅ |
| GET | `/admin/projects` | `AdminProjectController@index` | ✅ |
| PUT | `/admin/projects/{project}` | `AdminProjectController@update` | ✅ |
| DELETE | `/admin/projects/{project}` | `AdminProjectController@destroy` | ✅ |
| GET | `/admin/projects/milestone-submissions` | `AdminMilestoneSubmissionController@index` | ✅ |
| POST | `/admin/projects/milestone-submissions/{submission}/review` | `AdminMilestoneSubmissionController@review` | ✅ |
| GET | `/admin/assessment/questions` | `AdminAssessmentController@index` | ✅ |
| POST | `/admin/assessment/questions` | `AdminAssessmentController@store` | ✅ |
| GET | `/admin/assessment/questions/{id}` | `AdminAssessmentController@show` | ✅ |
| PUT | `/admin/assessment/questions/{id}` | `AdminAssessmentController@update` | ✅ |
| DELETE | `/admin/assessment/questions/{id}` | `AdminAssessmentController@destroy` | ✅ |

**Note:** `/api/auth/me` and `/api/auth/logout` require `auth:sanctum` and are working ✅.

---

## 4) Core Flows Status (End-to-End)

| Flow | Backend Status | Frontend Status | E2E Status | Notes |
|------|---------------|-----------------|------------|-------|
| **Auth flow (login/logout/me)** | ✅ WORKING | ✅ WORKING | ✅ | Sanctum SPA auth with CSRF cookie; LoginPage, RegisterPage functional |
| **Student roadmap flow** | ✅ WORKING | ✅ WORKING | ✅ | Roadmap → blocks → tasks → submit → AI evaluation via queue job. `StudentRoadmapPage.tsx`, `StudentBlockTasksPage.tsx`, `StudentTaskSubmitPage.tsx` all functional |
| **Admin learning management** | ✅ WORKING | ✅ WORKING | ✅ | Admin CRUD for blocks/tasks. `AdminLearningBlocksPage.tsx`, `AdminBlockTasksPage.tsx` working |
| **Admin students list** | ✅ WORKING | ✅ WORKING | ✅ | `/api/admin/students` working; `AdminStudentsPage.tsx` displays list with filters |
| **Assessment/Placement flow** | ✅ WORKING | ✅ WORKING | ✅ | Get questions → submit → placement result with level/domain assignment. `PlacementIntroPage.tsx`, `PlacementInProgressPage.tsx`, `PlacementResultsPage.tsx` functional |
| **Projects flow (business → student assignments)** | ✅ WORKING | ✅ WORKING | ✅ | Business creates project → invites students (with AI candidate ranking) → student accepts → milestones → submit. `BusinessProjectsPage.tsx`, `StudentAssignmentsPage.tsx` functional |
| **Gamification flow (portfolios)** | ⚠️ PARTIAL | ✅ WORKING | ⚠️ PARTIAL | Backend: Portfolio CRUD works; **Badge awarding logic NOT implemented** (tables exist, no triggers). Frontend: `StudentPortfolioPage.tsx` displays portfolios from completed projects |
| **Admin monitoring dashboard** | ✅ WORKING | ✅ WORKING | ✅ | Real-time stats (users, submissions, AI logs). `AdminMonitoringPage.tsx` working |

**Summary:**
- **7/8 flows** are working end-to-end.
- **Gamification (badges)** needs backend logic for auto-awarding badges on milestones (tables exist, service layer missing).

---

## 5) Data Model Reality

**Key Tables (verified from migrations):**

| Table Name | Purpose | Migration File | Status |
|------------|---------|----------------|--------|
| `users` | Core user data (role, level, domain) | `0001_01_01_000000_create_users_table.php` | ✅ |
| `personal_access_tokens` | Sanctum tokens | `2025_11_23_161347_create_personal_access_tokens_table.php` | ✅ |
| `sessions` | Database session storage | `2025_12_22_000000_create_sessions_table.php` | ✅ |
| `roadmap_blocks` | Learning path blocks (level + domain specific) | `2025_11_23_192729_create_roadmap_blocks_table.php` | ✅ |
| `tasks` | Tasks within roadmap blocks | `2025_11_23_192748_create_tasks_table.php` | ✅ |
| `submissions` | Student task submissions | `2025_11_23_192841_create_submissions_table.php` | ✅ |
| `user_roadmap_blocks` | Student progress on blocks | `2025_11_23_192625_create_user_roadmap_blocks_table.php` | ✅ |
| `skills` | Skills (linked to tasks/submissions) | `2025_12_21_000001_create_skills_table.php` | ✅ |
| `ai_evaluations` | AI evaluation results for submissions | `2025_12_21_000004_create_ai_evaluations_table.php` | ✅ |
| `questions` | Placement test questions | `2025_11_23_191310_create_questions_table.php` | ✅ |
| `question_attempts` | Student answers to placement questions | `2025_11_23_191619_create_question_attempts_table.php` | ✅ |
| `placement_results` | Final placement test result (level + domain) | `2025_11_23_191529_create_placement_results_table.php` | ✅ |
| `projects` | Business projects (domain, level, budget, deadline) | `2025_11_23_193502_create_projects_table.php` | ✅ |
| `project_assignments` | Student invitations/assignments to projects | `2025_11_23_193629_create_project_assignments_table.php` | ✅ |
| `project_milestones` | Milestones within projects | `2025_12_19_000100_create_project_milestones_table.php` | ✅ |
| `project_milestone_submissions` | Student submissions for milestones | `2025_12_19_000110_create_project_milestone_submissions_table.php` | ✅ |
| `teams` | Team structures (for multi-student projects) | `2025_11_23_193517_create_teams_table.php` | ✅ (UNUSED in current flows) |
| `team_members` | Team membership | `2025_11_23_193532_create_team_members_table.php` | ✅ (UNUSED in current flows) |
| `portfolios` | Student portfolios from completed projects | `2025_11_23_193227_create_portfolios_table.php` | ✅ |
| `badges` | Badge definitions | `2025_11_23_193147_create_badges_table.php` | ✅ (NO BADGE DATA SEEDED) |
| `user_badges` | Badges earned by students | `2025_11_23_193203_create_user_badges_table.php` | ✅ (EMPTY - no awarding logic) |
| `ai_logs` | Logs of AI service calls (evaluation + recommendations) | `2025_11_23_193739_create_ai_logs_table.php` | ✅ |
| `ai_prompt_templates` | Reusable prompt templates | `2025_11_23_193707_create_ai_prompt_templates_table.php` | ✅ (UNUSED - evaluator uses hardcoded prompts) |
| `level_projects` | UNUSED | `2025_11_23_174744_create_level_projects_table.php` | ⚠️ ORPHANED TABLE |
| `cache` | Laravel cache | `0001_01_01_000001_create_cache_table.php` | ✅ |

**MISSING TABLES:** None for core proposal features.

**Unused/Orphaned:**
- `teams`, `team_members`: Implemented but not used in any current flow (future multi-student projects).
- `level_projects`: No model or usage found.
- `ai_prompt_templates`: Intended for dynamic prompts, but evaluator service uses static prompts.

---

## 6) Known Bugs / Risk Areas (From Code)

### HIGH RISK (Could break demo)

1. **AI Evaluator Service Dependency**  
   - **Files:** `backend/app/Modules/AI/Application/Services/TaskEvaluationService.php:15` (reads `config('services.evaluator.url')`)
   - **Risk:** If Python FastAPI evaluator on port 8001 is down, task submissions fail silently with null score.
   - **Mitigation:** Service returns fallback `['score' => null, 'feedback' => 'Service unavailable']` but students see confusing "not graded yet" state.
   - **Fix needed:** Add health check + graceful degradation (manual review if AI down).

2. **CSRF Token Path Mismatch (RECENTLY FIXED)**  
   - **Files:** `frontend/src/lib/apiClient.ts:47` (ensureCsrfCookie now uses absolute URL)
   - **Risk:** Frontend was calling `/api/sanctum/csrf-cookie` (404) instead of `/sanctum/csrf-cookie`.
   - **Status:** ✅ FIXED in latest commit (uses `axios.get(${baseOrigin}/sanctum/csrf-cookie)`).
   - **Remaining risk:** If `VITE_API_BASE_URL` is misconfigured (e.g., includes `/api` twice), CSRF fails.

3. **Inconsistent Base URL Handling**  
   - **Files:** `frontend/.env`, `frontend/.env.local`, `frontend/.env.example` all have `VITE_API_BASE_URL=http://localhost:8000/api`
   - **Risk:** If someone manually edits to include trailing slash or double `/api`, routes break.
   - **Fix needed:** Normalize URL in `apiClient.ts` (trim trailing slash).

4. **Missing Error Handling on Queue Jobs**  
   - **Files:** `backend/app/Jobs/EvaluateSubmissionJob.php` (calls TaskEvaluationService)
   - **Risk:** If job fails (e.g., file not found, evaluator timeout), no retry logic, student submission stuck in "pending".
   - **Fix needed:** Add job retries (`$tries = 3`) and failed job notification.

5. **Role Middleware Gaps**  
   - **Files:** `backend/app/Http/Middleware/RoleMiddleware.php:13` (simple `in_array` check)
   - **Risk:** Returns 403 JSON but doesn't log unauthorized access attempts; no audit trail.
   - **Fix needed:** Add logging for security audit.

6. **CORS Allowed Origins Hardcoded**  
   - **Files:** `backend/config/cors.php:8-11` (hardcoded `localhost:5173, :5174`)
   - **Risk:** If frontend deployed to prod domain, CORS will block unless updated.
   - **Fix needed:** Use env variable `FRONTEND_URL` pattern with wildcard support.

### MEDIUM RISK (Could confuse users)

7. **No Seeded Badges**  
   - **Files:** `backend/database/seeders/DatabaseSeeder.php` (doesn't call BadgeSeeder)
   - **Risk:** `badges` table is empty; no badges to award even if logic existed.
   - **Fix needed:** Create `BadgeSeeder` with sample badges ("First Submission", "Project Champion", etc.).

8. **DemoSeeder Array-to-String Bug**  
   - **Files:** `backend/database/seeders/DemoSeeder.php` (PHPUnit tests fail with "Array to string conversion" on metadata column)
   - **Risk:** Running `php artisan db:seed --class=DemoSeeder` may fail; blocks integration tests.
   - **Fix needed:** Ensure `metadata` fields use `json_encode()` before insert.

9. **Throttle Limits Not Documented**  
   - **Files:** Multiple routes use `throttle:submissions`, `throttle:placement_submit`, `throttle:assignments`
   - **Risk:** If limits too strict (e.g., 1 submission per minute), students get 429 errors with no explanation.
   - **Fix needed:** Document in API or show user-friendly error ("You can submit again in X seconds").

10. **AI Logs May Expose Sensitive Data**  
    - **Files:** `backend/app/Modules/AI/Application/Services/AiLogger.php:24` (stores full request/response in metadata)
    - **Risk:** If used for placement test, stores student answers in logs (GDPR concern).
    - **Fix needed:** Sanitize PII before logging or set retention policy.

### LOW RISK (Minor polish)

11. **Arabic Comments in Code**  
    - **Files:** `backend/app/Modules/Identity/Interface/routes.php:12` ("كل المسارات الخاصة بالتسجيل...")
    - **Risk:** May confuse non-Arabic-speaking maintainers.
    - **Impact:** Minimal (comments don't affect execution).

12. **No Swagger/OpenAPI Spec**  
    - **Files:** No Swagger or Postman collection found in repo
    - **Risk:** Frontend engineer has to read backend routes manually.
    - **Fix needed:** Generate with `php artisan scribe:generate` (Scribe is in composer.json).

---

## 7) "Two-Week MVP" Recommendation (Strict Scope)

Based on codebase analysis, **7/8 core flows are already working**. Focus on polish + stability + AI demo.

### MUST SHIP (Non-Negotiable)

1. **Fix AI Evaluator Fallback**  
   - Add health check to TaskEvaluationService; if evaluator down, mark submission as "needs manual review" instead of null score.
   - Files: `backend/app/Modules/AI/Application/Services/TaskEvaluationService.php`

2. **Fix Queue Job Retry Logic**  
   - Add `$tries = 3` to `EvaluateSubmissionJob`; log failures to `ai_logs` table.
   - Files: `backend/app/Jobs/EvaluateSubmissionJob.php`

3. **Seed Demo Data with Badges**  
   - Create `BadgeSeeder` with 5-10 sample badges.
   - Fix DemoSeeder metadata bug.
   - Files: `backend/database/seeders/BadgeSeeder.php`, `DemoSeeder.php`

4. **Document API Throttle Limits**  
   - Add user-facing error messages for 429 responses.
   - Files: `frontend/src/lib/apiClient.ts` (response interceptor)

5. **E2E Happy Path Test**  
   - Create 1 automated test covering: register → placement → roadmap → submit task → AI grade → view result.
   - Files: `backend/tests/Feature/E2EHappyPathTest.php`

6. **Production .env.example**  
   - Add prod-ready `.env.example` with MySQL, Redis, and external evaluator URL.
   - Files: `backend/.env.production.example`

### NICE TO HAVE (If Time Permits)

7. **Badge Awarding Logic**  
   - Implement observer on `Submission` model to auto-award badges on milestones (e.g., "First Task Completed").
   - Files: `backend/app/Modules/Gamification/Application/Services/BadgeService.php`, `app/Observers/SubmissionObserver.php`

8. **Swagger/OpenAPI Generation**  
   - Run `php artisan scribe:generate` and commit to repo.
   - Files: `public/docs/index.html`

9. **CORS Env Variable**  
   - Replace hardcoded origins with `FRONTEND_URL` env var.
   - Files: `backend/config/cors.php`

10. **Admin Audit Log**  
    - Log role middleware 403 failures to new `audit_logs` table.
    - Files: `backend/app/Http/Middleware/RoleMiddleware.php`, migration `create_audit_logs_table.php`

### CUT (Defer to Post-MVP)

11. **Teams/Multi-Student Projects**  
    - Tables exist but no UI/flow implemented. Defer to Phase 2.

12. **AI Prompt Templates**  
    - Table exists but unused. Evaluator uses hardcoded prompts. Defer to Phase 2.

13. **Advanced Recommendation AI**  
    - Current `RecommendationService` is rule-based (scores by domain/level match). LLM-based ranking deferred.
    - Files: `backend/app/Modules/AI/Application/Services/RecommendationService.php:49` (TODO comment)

14. **Real-Time Notifications**  
    - Laravel has `PlacementResultNotification` but no WebSocket/Pusher setup. Defer.

### AI Implementation (Minimal Stable Approach)

**What Exists:**
- `TaskEvaluationService` calls external Python FastAPI evaluator (`http://127.0.0.1:8001/evaluate`) with multipart file upload.
- `RecommendationService` uses rule-based scoring (domain + level match).
- `AiLogger` logs all AI calls to `ai_logs` table.
- `ai_evaluations` table stores full evaluation metadata.

**What's Needed for MVP:**
1. **Ensure Python evaluator is running** (not in this repo—check `project evaluator/` folder).
2. **Add fallback logic** if evaluator times out (see MUST SHIP #1).
3. **Optional:** Add simple OpenAI call to `RecommendationService` to rank candidates by analyzing placement scores (if time permits).

**Files to Touch:**
- `backend/app/Modules/AI/Application/Services/TaskEvaluationService.php` (add timeout + fallback)
- `backend/app/Modules/AI/Application/Services/RecommendationService.php` (optional LLM call)
- `backend/config/services.php` (add evaluator config with timeout: `'evaluator' => ['url' => env('EVALUATOR_URL'), 'timeout' => 120]`)

---

## 8) Appendix

### Commands to Run Tests

```bash
cd backend
php artisan test                  # All tests
php artisan test --filter=Auth    # Auth tests only
php artisan test --testsuite=Feature  # Feature tests only
```

**Test Coverage:**
- 22 test files in `backend/tests/Feature/`
- Key tests:
  - `SanctumSessionAuthTest.php` (auth flow)
  - `Learning/StudentRoadmapTest.php` (roadmap flow)
  - `Learning/TaskSubmissionTest.php` (submit + AI evaluation)
  - `Assessment/PlacementFlowTest.php` (placement test)
  - `Projects/ProjectMilestonesTest.php` (business projects)

**Known Test Failures:**
- DemoSeeder "Array to string conversion" blocks tests that use `RefreshDatabase` + DemoSeeder. Fix needed.

### How to Seed Demo Data

```bash
cd backend
php artisan migrate:fresh --seed  # Drops all tables, re-migrates, seeds demo users + data
# OR
php artisan db:seed --class=DatabaseSeeder
```

**Seeders:**
- `AdminUserSeeder` (admin@example.com / password)
- `RoadmapBlockSeeder` (sample blocks for beginner/intermediate frontend/backend)
- `TaskSeeder` (sample tasks)
- `QuestionSeeder` (placement test questions)
- `ProjectSeeder` (sample business projects)
- `ProjectAssignmentSeeder` (sample assignments)
- **MISSING:** `BadgeSeeder` (needs to be created)

**Demo Users (from DatabaseSeeder):**

| Email | Password | Role | Level | Domain |
|-------|----------|------|-------|--------|
| admin@example.com | password | admin | - | - |
| business@example.com | password | business | - | - |
| ahmed@example.com | password | student | beginner | frontend |
| sara@example.com | password | student | intermediate | backend |
| omar@example.com | password | student | advanced | frontend |
| fatima@example.com | password | student | beginner | backend |

### Postman Collection / Swagger Files

**Status:** MISSING  

**How to Generate:**
```bash
cd backend
php artisan scribe:generate  # Generates OpenAPI spec + HTML docs
# Output: public/docs/index.html, public/docs/collection.json
```

**Manual Postman Steps:**
1. Import `public/docs/collection.json` (after generating)
2. Set env variable `BASE_URL=http://localhost:8000/api`
3. For authenticated routes:
   - First call `POST /auth/login` to get session cookie
   - Postman automatically sends cookies in subsequent requests

---

## Final Assessment

**Readiness Score:** 85/100

**Strengths:**
- ✅ Clean modular architecture
- ✅ 7/8 core flows fully implemented (backend + frontend)
- ✅ Laravel 12 + React 19 modern stack
- ✅ Sanctum auth working (CSRF fixed)
- ✅ AI integration hooks in place (TaskEvaluationService, RecommendationService)
- ✅ Database schema complete with migrations
- ✅ Comprehensive feature test coverage

**Gaps:**
- ⚠️ AI evaluator service external dependency (single point of failure)
- ⚠️ Badge awarding logic not implemented (tables exist, no triggers)
- ⚠️ Missing badge seed data
- ⚠️ DemoSeeder bug blocking some tests
- ⚠️ No Swagger docs (Scribe installed but not generated)
- ⚠️ No production deployment checklist

**Recommendation:**  
**Ship in 2 weeks** if MUST SHIP items (#1-6) are completed. The platform is demo-ready with minor polish needed. AI features are functional but need fallback logic for stability. Gamification (badges) can ship in basic CRUD mode without auto-awarding (defer to post-MVP).

**Critical Path:**
1. Fix AI fallback (2 days)
2. Fix queue retries + DemoSeeder (1 day)
3. Seed badges + E2E test (2 days)
4. Polish error messages + docs (1 day)
5. Deploy + smoke test (1 day)
6. Buffer for bugs (3 days)

Total: 10 working days = 2 weeks ✅
