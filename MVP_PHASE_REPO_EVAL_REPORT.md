# MVP Phase — Repo URL Evaluation Report

## Summary ✅
Switched evaluation from file-based to GitHub repo URL-based (no file upload). Added strict timeouts so submissions never hang. Evaluator returns fast fallback when OpenAI API key is missing/invalid.

## Files changed 🔧

### Evaluator (Python FastAPI)
- **project evaluator/main.py**
  - Now accepts JSON body with `repo_url`, `answer_text`, `student_run_status`, `task_title`, `task_description`
  - No file required for evaluation
  - If `OPENAI_API_KEY` missing or placeholder (`sk-test`): returns fast fallback in <1s with `ai_disabled: true`
  - Legacy multipart form still supported for backwards compatibility

### Backend (Laravel)
- **app/Modules/AI/Application/Services/TaskEvaluationService.php**
  - Switched from multipart file upload to JSON POST
  - Added strict timeouts: `connectTimeout: 5s`, `totalTimeout: 15s`
  - On timeout: returns `evaluation_outcome: 'manual_review'` with `reason: 'evaluator_timeout'`
  - Validates GitHub repo URL when `requires_attachment=true`

- **app/Modules/Learning/Application/Services/RoadmapService.php**
  - Stores `student_run_status` in submission metadata

- **app/Modules/Learning/Interface/Http/Requests/SubmitTaskRequest.php**
  - Accepts `run_status` field (max 1000 chars)
  - Removed localhost URL restriction (GitHub URLs allowed)

### Frontend (React)
- **src/pages/student/StudentTaskSubmitPage.tsx**
  - "Attachment URL" → "GitHub Repo URL" when `requires_attachment=true`
  - Added "How to run it" optional field
  - GitHub URL format validation: `https://github.com/user/repo`
  - Sends `run_status` in payload

## Sample JSON request/response

### Submit request
```json
POST /api/student/tasks/1/submit

{
  "answer_text": "I implemented the landing page with responsive design...",
  "attachment_url": "https://github.com/student/my-landing-page",
  "run_status": "npm install && npm start"
}
```

### Evaluator request (backend → evaluator)
```json
POST http://127.0.0.1:8001/evaluate

{
  "repo_url": "https://github.com/student/my-landing-page",
  "answer_text": "I implemented the landing page with responsive design...",
  "student_run_status": "npm install && npm start",
  "task_title": "Build a static landing page",
  "task_description": "HTML structure + basic CSS",
  "known_issues": ""
}
```

### Evaluator response (AI disabled fallback)
```json
{
  "success": true,
  "data": {
    "functional_score": 0,
    "code_quality_score": 0,
    "total_score": 0,
    "passed": false,
    "summary": "AI evaluation is disabled. Your submission requires manual review by an instructor.",
    "ai_disabled": true,
    "developer_assessment": {
      "estimated_level": "unclear",
      "improvement_suggestions": ["Submit for manual review"]
    }
  }
}
```

### getSubmission response (semantic_status: manual_review)
```json
GET /api/student/submissions/123

{
  "data": {
    "id": 123,
    "status": "needs_manual_review",
    "evaluation_status": "manual_review",
    "user_message": "Needs manual review",
    "ai_evaluation": {
      "status": "failed",
      "semantic_status": "manual_review",
      "score": null,
      "feedback": "AI evaluation is disabled...",
      "meta": {
        "evaluation_outcome": "manual_review",
        "ai_disabled": true
      }
    }
  }
}
```

Note: When the evaluator fails due to a network or timeout (`reason: "evaluator_timeout"`), the API returns a more specific `user_message` to the student:

```json
{
  "data": {
    "evaluation_status": "manual_review",
    "user_message": "Evaluation timed out. Please try again later or ask an admin to review.",
    "ai_evaluation": {
      "meta": { "evaluation_outcome": "manual_review", "reason": "evaluator_timeout" }
    }
  }
}
```

## Command outputs

### Backend tests
```
PASS  Tests\Feature\Learning\TaskSubmissionTest
  ✓ student can submit task                                               8.21s
  ✓ requires attachment validation                                        0.05s
  ✓ get submission returns semantic status and user message               0.08s
  ✓ requires attachment allows submission when attachment provided        0.05s

Tests:    4 passed (23 assertions)
Duration: 8.74s
```

### Frontend build
```
vite v7.3.0 building client environment for production...
✓ 53 modules transformed.
public/build/manifest.json             0.33 kB │ gzip:  0.17 kB
public/build/assets/app-ClSZl8Cv.css  39.28 kB │ gzip:  9.35 kB
public/build/assets/app-CAiCLEjY.js   36.35 kB │ gzip: 14.71 kB
✓ built in 2.17s
```

## How to test

### 1. Start evaluator (with or without real API key)
```powershell
cd "project evaluator"
# With placeholder key (fast fallback mode):
$env:OPENAI_API_KEY="sk-test"
.\venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### 2. Start queue worker
```powershell
cd backend
php artisan queue:work --queue=default --tries=3 --sleep=1
```

### 3. Submit a task with GitHub URL
- Navigate to a task that requires attachment
- Enter GitHub repo URL (e.g., `https://github.com/user/repo`)
- Optionally add "How to run it" instructions
- Submit

### 4. Check result
- Polling shows progress
- Within 15s max, result appears:
  - If AI disabled: `manual_review` with fallback feedback
  - If AI available: `completed` with full evaluation

## Timeout guarantees
| Stage | Timeout |
|-------|---------|
| Health check | 3s |
| Connect | 5s |
| Total request | 15s |
| Max polling attempts | 24 × 2.5s = 60s |

If any timeout is hit, submission is marked `needs_manual_review` with `evaluation_outcome: 'manual_review'` and `reason: 'evaluator_timeout'`.
