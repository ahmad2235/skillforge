# MVP Phase 2 — Submission Feedback Live Update

## Summary ✅
Implemented live update (polling) for submission feedback so the student UI shows AI feedback as soon as the asynchronous evaluator finishes. Polling is safe, bounded, and avoids running forever when evaluator/queue is down.

---

## Files changed 🔧
- backend/app/Modules/Learning/Infrastructure/Models/Submission.php
  - Added `aiEvaluations()` relation and `latestAiEvaluation()` helper.
- backend/app/Modules/Learning/Interface/Http/Controllers/TaskController.php
  - Updated `getSubmission()` response to include `ai_evaluation` and a deterministic `user_message` mapping.
- frontend/src/hooks/useSubmissionPolling.ts
  - New hook implementing polling with stop conditions and safe cleanup.
- frontend/src/pages/student/StudentTaskSubmitPage.tsx
  - Integrated polling hook, updated UI to show live evaluation state, spinner, timeout/unavailable messages and "Ask admin to review" action.
- frontend/src/lib/apiErrors.ts
  - Added `isNotImplemented()` helper to satisfy build.

---

## Polling behaviour & configuration ⚙️
- Polling interval: **2.5 seconds** (2500 ms)
- Maximum attempts: **24** (~60 seconds)
- Stop conditions (any of these stops polling):
  - a) Submission becomes **completed** (submission status `evaluated` or `ai_evaluation.status == 'succeeded'`).
  - b) Submission becomes **unavailable/failed** (submission status `needs_manual_review` or `ai_evaluation.status == 'failed'`).
  - c) **Max attempts reached** (24 attempts → stopReason: `timeout`).

---

## Backend response contract (getSubmission)
File: `backend/app/Modules/Learning/Interface/Http/Controllers/TaskController.php` — `getSubmission(int $submissionId)` now returns `data` with:
- `id` (submission id)
- `status` (submission.status)
- `ai_evaluation`: object (nullable) with keys:
  - `status` — string e.g., `running|succeeded|failed`
  - `score` — integer|null
  - `feedback` — string|null
  - `updated_at` — ISO timestamp|null
- `user_message` — derived from status (one of):
  - pending => "Evaluation in progress"
  - completed => "Evaluation complete"
  - unavailable/failed => "AI evaluator unavailable — needs manual review"

Example: pending response (payload.data):

{
  "id": 123,
  "status": "evaluating",
  "is_evaluated": false,
  "ai_evaluation": null,
  "user_message": "Evaluation in progress"
}

Example: completed response (payload.data):

{
  "id": 123,
  "status": "evaluated",
  "is_evaluated": true,
  "ai_evaluation": {
    "status": "succeeded",
    "score": 85,
    "feedback": "✅ You passed the evaluation. Functional: 60/70 | Code Quality: 25/30 | Total: 85/100\nSummary: ...",
    "updated_at": "2025-12-23T09:14:12Z"
  },
  "user_message": "Evaluation complete"
}

---

## Frontend changes (behavior and UI)
- New hook: `useSubmissionPolling(submissionId, {intervalMs=2500, maxAttempts=24})` returns `{ aiEvaluation, isPolling, attempts, status, stopReason }`.
- The student's submit page (`StudentTaskSubmitPage.tsx`) uses the hook when `submissionId` becomes available and:
  - Shows **"Evaluating..."** + spinner while polling.
  - Replaces the placeholder feedback with the actual AI feedback when it becomes available.
  - If evaluator is unavailable or job fails, shows: **"AI evaluator unavailable — needs manual review"** and a button **"Ask admin to review"** (since there is no public retry-evaluation endpoint).
  - If polling times out (max attempts), shows a timeout message and the same ask-admin action.
- Cleans up: interval is cleared on unmount and on stop conditions; duplication is avoided with internal ref guard.

---

## Manual test steps (demo) 🧪
1. Ensure services are running:
   - Evaluator: `cd "project evaluator" && venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001`
   - Backend: `cd backend && php artisan serve` (or `composer dev`)
   - Queue worker: `cd backend && php artisan queue:work --tries=3`
   - Frontend dev server: `cd frontend && npm run dev`

2. Submit task with evaluator ON:
   - Submit solution in student UI.
   - You should see **Submitted** status and **Evaluating...** spinner.
   - When evaluation finishes (job processed), feedback and score appear automatically without page refresh.

3. Submit task with evaluator OFF (or simulate failure):
   - Submit solution.
   - Polling will run until timeout (~60s) and then show timeout message, or stop earlier if backend marks submission `needs_manual_review`.
   - UI shows **Ask admin to review** button.

---

## Diagnostic outputs captured 🧾
- Route that polling uses (backend):

  Command run: `cd backend && php artisan route:list | findstr /I "student/submissions"`

  Output (snippet):

  GET|HEAD  api/student/submissions/{submission} App\Modules\Learning\Interface\Http\Controllers\TaskController@... 

  (Polling uses the client path `/student/submissions/{submission}`; the api client prefixes `/api` so actual request is `GET /api/student/submissions/{id}`.)

- Frontend build output (after changes):

  Command run: `cd frontend && npm run build`

  Output (snippet):

  > frontend@0.0.0 build
  > tsc -b && vite build

  vite v7.2.6 building client environment for production...
  ✓ 1917 modules transformed.
  dist/index.html                   0.47 kB │ gzip:   0.30 kB
  dist/assets/index-BvtoiFEL.css   46.66 kB │ gzip:   8.55 kB
  dist/assets/index--VEYf1V2.js   593.10 kB │ gzip: 171.47 kB
  
  (! ) Some chunks are larger than 500 kB after minification. Consider code splitting.

---

## Endpoint used by polling
Full path: `GET /api/student/submissions/{submissionId}`
(Frontend calls `apiClient.get(`/student/submissions/${id}`)` which prepends `/api`.)

---

## Notes & constraints ✅
- We did not change the asynchronous evaluation architecture — queue jobs are still used.
- No external UI libraries were added; UI changes are minimal.
- Polling is intentionally conservative (2.5s interval, 60s timeout). These values are configurable in the hook.

---

If you want, I can:
- Add an admin retry endpoint to re-queue failed submissions (optional),
- Add tests for the polling hook and the controller response contract.

Let me know which follow-ups you prefer.