# MVP Phase 5 Report — Semantic Evaluation Status (Backend)

## Summary ✅
This phase centralizes semantic evaluation mapping on the backend and exposes a stable `semantic_status` string via `GET /api/student/submissions/{id}` inside `ai_evaluation.semantic_status` and as a top-level `evaluation_status`. The `user_message` is derived from the semantic status and is stable.

## Files changed 🔧
- **backend/app/Modules/Learning/Interface/Http/Controllers/TaskController.php**
  - Added `mapSemanticStatus(Submission $submission, $latestAi)` private helper to centralize mapping.
  - `getSubmission()` now uses this mapper and returns `ai_evaluation.semantic_status` and `user_message` derived from semantic status.
  - Improved `evaluation_debug.message` population.
- **backend/app/Modules/Learning/Infrastructure/Models/Submission.php**
  - `latestAiEvaluation()` now prefers explicit `latest_ai_evaluation_id` (if present) to avoid ambiguous ordering between completed_at and recently created evaluations.
- **backend/tests/Feature/Learning/TaskSubmissionTest.php**
  - Added `test_get_submission_returns_semantic_status_and_user_message()` asserting `pending`, `completed`, and `manual_review` mappings.

## Semantic status mapping 🧭
Mapping rules (canonical):

- succeeded -> `completed`
  - user_message: `Evaluation complete`
- failed + metadata.evaluation_outcome = `manual_review` -> `manual_review`
  - user_message: `Needs manual review`
- failed + metadata.evaluation_outcome = `skipped` -> `skipped`
  - user_message: `Auto evaluation skipped`
- failed (no outcome) -> `failed`
  - user_message: `Evaluation failed — needs attention`
- no evaluation yet -> `pending`
  - user_message: `Evaluation in progress`

These are implemented in `TaskController::mapSemanticStatus()`.

## Sample API responses (examples)

- Pending (no evaluation yet):

```json
{
  "data": {
    "id": 123,
    "evaluation_status": "pending",
    "user_message": "Evaluation in progress",
    "ai_evaluation": null
  }
}
```

- Completed (succeeded ai_evaluation):

```json
{
  "data": {
    "id": 124,
    "evaluation_status": "completed",
    "user_message": "Evaluation complete",
    "ai_evaluation": {
      "id": 42,
      "status": "succeeded",
      "semantic_status": "completed",
      "score": 88,
      "feedback": "Good job",
      "updated_at": "2025-12-23T10:00:00Z"
    }
  }
}
```

- Manual review (failed + manual_review outcome):

```json
{
  "data": {
    "id": 125,
    "evaluation_status": "manual_review",
    "user_message": "Needs manual review",
    "ai_evaluation": {
      "id": 43,
      "status": "failed",
      "semantic_status": "manual_review",
      "meta": { "evaluation_outcome": "manual_review", "reason": "Missing file" }
    },
    "evaluation_debug": { "message": "Missing file" }
  }
}
```

---

## Test & Build outputs (captured)

### Backend: EvaluateSubmissionJobTest

```
PASS  Tests\Feature\Learning\EvaluateSubmissionJobTest
  ✓ evaluate submission job creates history and updates submission        7.73s
  ✓ missing attachment creates skipped or manual review                   0.09s

Tests:    2 passed (13 assertions)
Duration: 8.10s
```

### Backend: TaskSubmissionTest (after fixes)

```
PASS  Tests\Feature\Learning\TaskSubmissionTest
  ✓ student can submit task                                               7.73s
  ✓ requires attachment validation                                        0.04s
  ✓ get submission returns semantic status and user message               0.07s

Tests:    3 passed (19 assertions)
Duration: 8.19s
```

### Backend: AdminReEvaluateTest

```
PASS  Tests\Feature\Learning\AdminReEvaluateTest
  ✓ student is forbidden from re evaluate                                 7.77s
  ✓ admin can queue re evaluation job                                     0.05s

Tests:    2 passed (4 assertions)
Duration: 8.08s
```

### Frontend: build

```
vite v7.3.0 building client environment for production...
✓ 53 modules transformed.
public/build/manifest.json             0.33 kB │ gzip:  0.17 kB
public/build/assets/app-ClSZl8Cv.css  39.28 kB │ gzip:  9.35 kB
public/build/assets/app-CAiCLEjY.js   36.35 kB │ gzip: 14.71 kB
✓ built in 2.09s
```

---

## Notes & Rationale
- Centralizing semantic mapping prevents duplication and ensures both API fields (`evaluation_status` and `ai_evaluation.semantic_status`) remain consistent.
- Preferring `latest_ai_evaluation_id` for fetching the latest evaluation avoids ambiguity when a past evaluation has a non-null `completed_at` while a newer attempt was created but not completed.
- No DB migrations were added (constraint satisfied).

---

If you'd like, I can now add an explicit API contract spec (openapi snippet) showing the stable `semantic_status` string, or add an admin UI button to expose `ai_evaluation.semantic_status` in the admin list. Which would you prefer next? 
