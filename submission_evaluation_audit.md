# Submission Evaluation Audit

> Strict, actionable audit for the Submission Evaluation feature (student-facing). This document lists facts, exact code locations, UX failures, missing states, frontend logic issues, and a strict backend contract for a canonical `evaluation_status`.

---

## 1) Summary / TL;DR

The current evaluation state is scattered and inferred across multiple places: `submission.status`, `submission.is_evaluated`, `ai_evaluations.status`, and `ai_evaluations.metadata.*` while the controller derives a semantic status on the fly. That duplication causes inconsistent client displays, confusing messages (e.g., pending vs timed out vs manual review), and brittle UI code that infers state. The fix: introduce a single authoritative field `submission.evaluation_status` (enum: `queued`, `evaluating`, `completed`, `timed_out`, `manual_review`, `failed`, `skipped`), make all writers set it deterministically, change readers to consume it only, and remove inference rules from client/controller logic except for a short migration fallback.

---

## 2) Backend Analysis (facts, file-by-file)

> All references are exact file paths in the repository and describe where evaluation state is written, inferred, or derived.

### Files that write, infer, or derive evaluation state

- `app/Jobs/EvaluateSubmissionJob.php`
  - Functions / lines of interest:
    - `handle()` — updates submission lifecycle: sets `['status' => 'evaluating']` early (job start), and on success writes snapshot fields: `ai_score`, `ai_feedback`, `ai_metadata`, `final_score`, sets `is_evaluated = true`, `evaluated_at = now()`, and `status = 'evaluated'`. (See assignments around the job success block)
    - `handleUnavailableEvaluator()` — when evaluator unavailable writes `status = 'needs_manual_review'`, creates an `AiEvaluation` with `status='failed'` and `metadata['evaluation_outcome']` set to 'manual_review' or 'skipped'. It clears snapshot fields and sets `is_evaluated=false`.
    - `failed()` — when job fails after retries sets `status = 'needs_manual_review'` and writes `ai_metadata` describing job failure.
  - How state is handled: job writes directly to `submission.status` and snapshot fields; creates or updates `ai_evaluations` audit rows.

- `app/Modules/Learning/Interface/Http/Controllers/TaskController.php`
  - Functions / lines of interest:
    - `getSubmission($submissionId)` — loads submission and calls `latestAiEvaluationResolved()`; builds `ai_evaluation` object returned to clients. It returns an `evaluation_status` derived from `mapSemanticStatus()` (not stored on the submission as a canonical value).
    - `mapSemanticStatus(Submission $submission, $latestAi = null)` — inspects `latestAi->status`, `latestAi->metadata['evaluation_outcome']`, `submission->status`, and `submission->is_evaluated` to derive a semantic status string (`pending`, `completed`, `manual_review`, `skipped`, `failed`). This derived status is what the existing frontend reads as `semanticStatus`.
  - How state is handled: the controller derives a semantic status rather than returning a single canonical DB field.

- `app/Modules/Learning/Application/Services/RoadmapService.php`
  - Functions / lines of interest:
    - `submitTask()` — creates `Submission` with `status = 'submitted'`, creates an initial queued `AiEvaluation` with `status = 'queued'` (in the `ai_evaluations` table) and dispatches `EvaluateSubmissionJob`.
  - How state is handled: submission creation sets `status='submitted'` and ensures an initial queued ai_evaluation exists.

- `app/Modules/Learning/Application/Services/AiEvaluationService.php`
  - Functions / lines of interest:
    - `recordEvaluation()` (alias `recordSucceeded()`) — creates `AiEvaluation` row with `status='succeeded'` and updates the `Submission` snapshot (`ai_score`, `ai_feedback`, `final_score`, `is_evaluated = true`, `status = 'evaluated'`).
    - `recordFailure()` — creates 'failed' `AiEvaluation`.
  - How state is handled: `ai_evaluations` is append-only audit trail; `Submission` snapshot fields are updated as convenience/fast reads.

- `app/Modules/Learning/Interface/Http/Controllers/AdminSubmissionReviewController.php`
  - Functions / lines of interest:
    - `reEvaluate(Submission $submission)` dispatches `EvaluateSubmissionJob` and returns a message `Evaluation queued.` but does not consistently create a queued ai_evaluation row nor set a canonical evaluation state on the submission.
  - How state is handled: admin re-evaluate simply dispatches job (no explicit canonical queue state written).

- `app/Modules/Learning/Infrastructure/Models/Submission.php`
  - Functions / lines of interest:
    - `latestAiEvaluationResolved()` — returns `latest_ai_evaluation` or falls back to most recent `ai_evaluations` row (by `completed_at` / `created_at`).
  - How state is handled: the submission stores snapshot fields: `status`, `ai_score`, `ai_feedback`, `ai_metadata`, `is_evaluated`, `latest_ai_evaluation_id` — these are used for read paths and for the heuristic `mapSemanticStatus()`.

- `app/Modules/Learning/Infrastructure/Models/AiEvaluation.php`
  - Fields / behavior:
    - `status` enum: `queued|running|succeeded|failed` (low-level lifecycle)
    - `metadata` carries higher-level `evaluation_outcome` like `manual_review` or `skipped` and `reason` codes.
  - How state is handled: `ai_evaluations` holds the run-by-run lifecycle and metadata; semantic outcomes are encoded into metadata rather than a first-class semantic column.


### Duplicated / conflicting state (explicit)
- `submission->status` is used for both submission lifecycle and evaluation lifecycle (`submitted`, `evaluating`, `evaluated`, `needs_manual_review`) — ambiguous.
- `submission->is_evaluated` duplicates `submission->status === 'evaluated'` semantics.
- `ai_evaluations.status` (lifecycle) vs `ai_evaluations.metadata.evaluation_outcome` (semantic outcome) — semantic outcomes often only exist in metadata.
- Controller `mapSemanticStatus()` derives a semantic string by combining `latestAi.status`, `metadata.evaluation_outcome`, `submission.status`, and `is_evaluated` — this inference is distributed and fragile.

---

## 3) Proposed canonical field & mapping

**Canonical field:** `submissions.evaluation_status` (ENUM)

**Enum values (strict):**
- `queued` — evaluation request created and queued.
- `evaluating` — evaluator actively running / job accepted (running).
- `completed` — AI evaluation finished successfully (score/feedback available).
- `timed_out` — evaluation request timed out; no final AI result.
- `manual_review` — decided/marked for manual human review (no AI score snapshot).
- `failed` — unrecoverable failure (job infra error) that requires attention.
- `skipped` — evaluator intentionally skipped evaluation (e.g., missing attachment; not an error).

**Mapping & rules:**
- Writers must set `submission.evaluation_status` deterministically at state transitions (job start, success, manual-review, timeout, failure, skip). No consumer should infer state from other fields.
- `ai_evaluations.status` remains the run lifecycle (`queued|running|succeeded|failed`) and is append-only. `ai_evaluations.metadata` contains `reason` and `evaluation_outcome` for debugging only.
- Controller/read endpoints return `evaluation_status` as canonical. If `evaluation_status` is missing (migration window), derive with migration fallback but simultaneously backfill DB.

**Backfill/migration**: derive existing evaluation_status values by scanning `latest_ai_evaluation` and submission snapshot fields, then persist them. After migration, remove reliance on derived semantic mapping.

---

## 4) Example JSON responses (canonical states)

> These are exact response shapes the API should return for `GET /api/student/submissions/{id}`.

### 4.1 Evaluating / queued
```json
{
  "data": {
    "id": 123,
    "submitted_at": "2025-12-24T10:00:00Z",
    "evaluation_status": "queued",
    "ai_evaluation": {
      "id": 987,
      "evaluation_request_id": "uuid-1",
      "status": "queued",
      "semantic_status": "queued",
      "score": null,
      "feedback": null,
      "meta": {"source": "submit"},
      "started_at": "2025-12-24T10:00:01Z",
      "completed_at": null
    }
  }
}
```

### 4.2 Running / evaluating
```json
{
  "data": {
    "id": 123,
    "evaluation_status": "evaluating",
    "ai_evaluation": {
      "id": 988,
      "evaluation_request_id": "uuid-2",
      "status": "running",
      "semantic_status": "evaluating",
      "started_at": "2025-12-24T10:00:10Z"
    }
  }
}
```

### 4.3 Completed (pass/fail)
```json
{
  "data": {
    "id": 123,
    "evaluation_status": "completed",
    "ai_evaluation": {
      "id": 990,
      "evaluation_request_id": "uuid-3",
      "status": "succeeded",
      "semantic_status": "completed",
      "score": 92,
      "feedback": "Good job; follow-up notes...",
      "completed_at": "2025-12-24T10:00:45Z"
    },
    "ai_score": 92,
    "final_score": 92,
    "ai_feedback": "Good job; follow-up notes..."
  }
}
```

### 4.4 Timed out
```json
{
  "data": {
    "id": 123,
    "evaluation_status": "timed_out",
    "ai_evaluation": {
      "id": 992,
      "evaluation_request_id": "uuid-5",
      "status": "failed",
      "semantic_status": "timed_out",
      "meta": {"reason":"evaluator_timeout","evaluation_outcome":"manual_review"},
      "started_at": "2025-12-24T10:10:00Z",
      "completed_at": "2025-12-24T10:10:30Z"
    },
    "ai_score": null,
    "ai_feedback": "Evaluation timed out after 30s"
  }
}
```

### 4.5 Manual review
```json
{
  "data": {
    "id": 123,
    "evaluation_status": "manual_review",
    "ai_evaluation": {
      "id": 993,
      "evaluation_request_id": "uuid-6",
      "status": "failed",
      "semantic_status": "manual_review",
      "feedback": "Task requires an attachment. Please re-submit.",
      "meta": {"reason":"missing_attachment","evaluation_outcome":"manual_review"}
    },
    "ai_score": null,
    "ai_feedback": "Task requires an attachment. Please re-submit."
  }
}
```

---

## 5) Frontend Analysis (components & hooks)

> Exact files and responsibilities inside the frontend code.

### Key files
- `frontend/src/pages/student/StudentTaskSubmitPage.tsx` — primary student submission page; renders the form, shows submission metadata, shows Feedback card and Debug panel; uses `useSubmissionPolling` hook.
- `frontend/src/hooks/useSubmissionPolling.ts` — polling hook that fetches `/student/submissions/{id}`, derives `semanticStatus`, controls attempts and progressPct, exposes `manualCheck()`.
- Feedback area / debug panel — implemented inline in `StudentTaskSubmitPage.tsx` (not separate component files): shows spinner/progress when `semanticStatus === 'pending'`, shows feedback when `semanticStatus === 'completed'` and debug info in a `<details>` section.

### Component / hook behavior and data usage

#### `StudentTaskSubmitPage.tsx`
- Uses: `useParams()` for task id, `useSubmissionPolling(submissionId, {intervalMs: 2500, maxAttempts: 24})` to read evaluation details.
- Local state: `aiFeedback`, `aiScore`, `submissionMeta` (id, submittedAt), `submitted` boolean, `fieldErrors`, `formMessage`.
- On submission: POST `/student/tasks/{id}/submit` → response used to set `submissionMeta.id` and initial `aiFeedback`/`aiScore` if returned; then polling starts using `submissionId`.
- Feedback UI shows:
  - Progress spinner + attempts while `semanticStatus === 'pending'`.
  - Progress bar width = `progressPct` (attempts/maxAttempts).
  - Final `aiFeedback` when `semanticStatus === 'completed'`.
  - `manualCheck()` is exposed as `Re-check now` button that performs a one-off GET and toasts result.
  - Debug `<details>` shows endpoint `/api/student/submissions/{submissionMeta.id}` and raw JSON of `aiEvaluation` + `evaluation_debug`.
- Problems:
  - Client uses `semanticStatus` derived by the poller (not equality to a canonical `submission.evaluation_status`).
  - Debug details are visible to students. No role gating.
  - `manualCheck()` action gives a toast but lacks queued confirmation or disabled state.

#### `useSubmissionPolling.ts`
- Inputs: `submissionId` (number|string|null), options `intervalMs` and `maxAttempts`.
- Outputs: `aiEvaluation`, `evaluationDebug`, `isPolling`, `semanticStatus`, `attempts`, `maxAttempts`, `progressPct`, `status`, `stopReason`, `lastUpdatedAt`, `lastError`, `manualCheck()`.
- Behavior (facts):
  - On `runPollOnce()` fetches `/student/submissions/${submissionId}` then:
    - Normalizes `ai_evaluation` and `evaluation_debug` fields.
    - Sets `aiEvaluation`, `evaluationDebug`, `status`.
    - Derives `semanticStatus` via priority:
      1. `payload.evaluation_status` (if present) — used as authoritative by the hook when available.
      2. `payload.ai_evaluation?.semantic_status` if present.
      3. Fallback derived from `ai_evaluation.status` mapping (`succeeded` -> `completed`, `failed` -> `failed`, `queued|running`->`pending`).
  - Stops polling when a server-provided semanticStatus is terminal (`completed`, `manual_review`, `skipped`, `failed`) or after `maxAttempts` → set `stopReason='timeout'`.
- Problems:
  - Hook mixes server-provided `evaluation_status` and derived fallback logic. If `evaluation_status` is present it is used — but until BE is changed, the hook does much inference.
  - `maxAttempts` is client-driven and may not match backend timeout policies.

### Edge cases & where data is used/abused
- `ai_evaluation` fields are sometimes missing (null id) and UI uses `submission` snapshot (`ai_score`, `ai_feedback`) as fallback — inconsistent.
- `evaluationDebug` is shown to students verbatim (including error messages and endpoint info) — this should be admin-only.
- No explicit handling for `timed_out` state — the hook will set `stopReason === 'timeout'` after hitting maxAttempts and UI displays a generic message.

---

## 6) UI/UX Failures (ranked)

### High severity (must fix)
1. **Status ambiguity / multiple authoritative signals** — UI shows `semanticStatus`, `stopReason`, `submissionStatus`, `aiEvaluation.status` in different spots — users can't tell the canonical outcome. (Impact: Trust/Understanding)
2. **Debug overexposure** — raw JSON + endpoint visible to students; error messages appear technical and demotivating. (Impact: Motivation/Trust)
3. **No explicit Timed-out / Manual Review banners** — lack of actionable copy when evaluation fails or times out. (Impact: Understanding/Motivation)

### Medium severity
1. **Re-check flow lack of queue confirmation** — user action `Re-check now` offers only a toast and no queued state, causing confusion. (Impact: Motivation)
2. **Scoring ambiguity** — UI shows a single `Score` without clarifying 'AI score' vs 'Final score' (overrides). (Impact: Trust)
3. **No skeleton/loading for admin submission sheet** — detail view opens blank while fetching. (Impact: Understanding)

### Low severity
1. **Redundant badges/text** — multiple "Submitted" badges redundant; UI looks noisy.
2. **Progress bar semantics** — progress percent is attempts-based not ETA-based; unclear meaning.

---

## 7) Missing UI States (must be added)

> For each state: suggested copy, visual treatment, and recommended actions.

### Evaluating / Queued
- Copy: **"Evaluation in progress — automated reviewer is checking your submission (usually 30–90s)."**
- Visual: Amber `Evaluating` badge + spinner + small attempt counter `Attempt X of Y` and indeterminate progress.
- Actions: None for students (admin: cancel), show `aria-live` region.

### Timed out / Delayed
- Copy: **"Evaluation timed out. Try re-checking or request manual review."**
- Visual: Red `Evaluation timed out` banner with ⚠️ icon and explanation. Buttons: `[Re-check]` and `[Request manual review]`.
- Actions: Re-check calls server re-evaluate endpoint (returns queued). Request manual review calls an endpoint creating a manual-review ticket and sets `evaluation_status='manual_review'`.

### Manual review pending
- Copy: **"Requires manual review — staff will review this submission."**
- Visual: Indigo `Manual review pending` banner, no score shown.
- Actions: Show expected turnaround time and contact support.

### Evaluation failed (unrecoverable)
- Copy: **"Automatic evaluation failed. Please request a manual review or contact support."**
- Visual: Red destructive banner; show short reason mapped to friendly messages.
- Actions: Request manual review; show admin-only debug link.

### Re-evaluation queued
- Copy: **"Re-evaluation queued — your submission will be re-checked shortly."**
- Visual: Gray info pill `Queued` with spinner; disable Re-check button.
- Actions: show evaluation_request_id and allow cancelling (admin only).

### Completed but no feedback
- Copy: **"Evaluation complete, but no feedback is available."**
- Visual: Neutral callout with explanation and actions: `[Request manual review]`.

---

## 8) Frontend Logic Gaps (concrete)

1. **Implicit semantic derivation**: `useSubmissionPolling` and `TaskController::mapSemanticStatus()` both attempt to derive a semantic state by combining multiple fields. This must be removed in favor of authoritative `submission.evaluation_status`.
2. **Timeout handling UX**: client `maxAttempts` may not reflect server timeouts; the client marks `stopReason='timeout'` and shows a generic message — instead the server should expose `timed_out` state and `evaluation_timeout_seconds`.
3. **Re-check UX**: `manualCheck()` is a one-off GET. It should be a POST `/submissions/{id}/re-evaluate` that returns `evaluation_request_id` and a queued response (202); UI must show queued state until server changes status.
4. **AI vs Final score**: UI currently shows a single score; frontend must present both `ai_score` and `final_score` separately when present.
5. **Debug info exposure**: raw `evaluation_debug` should not be shown to students by default; the client should only show a friendly `user_message` on student responses.
6. **Stale job handling**: frontend should not attempt to reconcile multiple evaluations — the server must supply `evaluation_request_id` to allow FE/BE to correlate runs.

---

## 9) Backend Contract Gaps (strict list)

### Required fields (server MUST return in `GET /api/student/submissions/{id}`)
- `evaluation_status` (string) — one of `queued|evaluating|completed|timed_out|manual_review|failed|skipped` — **REQUIRED** and authoritative.
- `ai_evaluation` (object|null) — optional but if present must include:
  - `id` (int)
  - `evaluation_request_id` (string UUID) — recommended
  - `status` (string: `queued|running|succeeded|failed`) — low-level lifecycle
  - `semantic_status` (string, optional; may mirror `evaluation_status` for auditing)
  - `score` (number|null)
  - `feedback` (string|null)
  - `meta` (object|null) — sanitized metadata (reason codes, evaluator timings)
  - `started_at`, `completed_at` timestamps
- `ai_score` (number|null), `final_score` (number|null), `ai_feedback` (string|null) — snapshot fields (optional but useful for display)
- `evaluation_debug` — **ADMIN/advanced** only; minimal fields for students unless role is admin: `message` (friendly reason) only for students.

### Add endpoints
- POST `/submissions/{id}/re-evaluate` — returns `202 Accepted` with `{ queued: true, evaluation_request_id }` and sets `submission.evaluation_status = 'queued'`.
- Optionally POST `/submissions/{id}/request-manual-review` — sets `evaluation_status = 'manual_review'` and logs a ticket.

### Failure & edge cases to be handled server-side
- **Timeout**: evaluator must set `evaluation_status='timed_out'` and include `meta.reason='evaluator_timeout'`.
- **Partial responses**: evaluator must return a structured status to indicate partial; server must set `evaluation_status='manual_review'` or `failed` depending on policy.
- **Duplicate / stale runs**: add `evaluation_request_id` per run and ensure job writes only if it is writing the latest run (compare ids or timestamps).
- **Admin requeue**: always create queued `ai_evaluations` row with `evaluation_request_id` and set `submission.evaluation_status='queued'` when reEvaluate is called.

---

## 10) Actionable next steps (short, prioritized)

1. **DB/Migration (BE)**: Add `evaluation_status` enum column to `submissions`, backfill values safely.
2. **Job changes (BE)**: Refactor `EvaluateSubmissionJob` to set `submission.evaluation_status` at transitions (queued→evaluating→completed/manual_review/timed_out/failed), add `evaluation_request_id` tracking, and prevent stale writes.
3. **Controller/Service changes (BE)**: `TaskController::getSubmission()` should return `submission.evaluation_status` directly and remove `mapSemanticStatus()` as primary logic (use as migration fallback only).
4. **API endpoint (BE)**: Add `POST /submissions/{id}/re-evaluate` returning `evaluation_request_id` and 202 response.
5. **Frontend changes (FE)**: Update `useSubmissionPolling` to read `evaluation_status` only, stop using fallback inference; update UI (`StudentTaskSubmitPage.tsx`) to show canonical banners/badges and restrict debug data to admins.
6. **UX changes (product)**: Add banners, copy, accessibility (aria-live), clear AI vs final score labels, and improve re-check/re-evaluate confirmation flows.

---

## Appendix: Quick references & notes

- Files of interest in repo:
  - `backend/app/Jobs/EvaluateSubmissionJob.php`
  - `backend/app/Modules/Learning/Interface/Http/Controllers/TaskController.php`
  - `backend/app/Modules/Learning/Application/Services/RoadmapService.php`
  - `backend/app/Modules/Learning/Application/Services/AiEvaluationService.php`
  - `backend/app/Modules/Learning/Interface/Http/Controllers/AdminSubmissionReviewController.php`
  - `backend/app/Modules/Learning/Infrastructure/Models/Submission.php`
  - `backend/app/Modules/Learning/Infrastructure/Models/AiEvaluation.php`
  - `frontend/src/pages/student/StudentTaskSubmitPage.tsx`
  - `frontend/src/hooks/useSubmissionPolling.ts`

- Tests to add/modify:
  - Assert `evaluation_status` transitions (queued→evaluating→completed|timed_out|manual_review|failed)
  - Assert `re-evaluate` endpoint enqueues and returns `evaluation_request_id` (202)
  - Assert EvaluateSubmissionJob refuses to overwrite newer evaluation runs (idempotency/stale-run tests)

---

**End of audit.**

This file is intentionally precise and prescriptive: it identifies where state is duplicated, prescribes an authoritative `evaluation_status` and a migration path, and lists required UI changes to avoid confusing students. If you'd like, I can now draft the DB migration and the minimal code diffs for the job/controller changes as a PR-ready patch.
