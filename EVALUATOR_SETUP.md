# SkillForge Project Evaluator Integration

Complete integration of the AI Project Evaluator into SkillForge for automatic assessment of student task submissions.

## Architecture Overview

```
Student submits task
         ↓
Laravel API: POST /student/tasks/{taskId}/submit
         ↓
RoadmapService::submitTask() - Creates Submission record
         ↓
Dispatches EvaluateSubmissionJob (async queue)
         ↓
EvaluateSubmissionJob runs in background
         ↓
TaskEvaluationService calls Python FastAPI evaluator
         ↓
Python evaluator (http://127.0.0.1:8001) processes with OpenAI GPT-4
         ↓
Results stored in submissions table (ai_score, ai_feedback, ai_metadata)
         ↓
Frontend polls GET /student/submissions/{id} until is_evaluated=true
         ↓
React displays evaluation results with detailed feedback
```

## Setup Instructions

### 1. Configure Python Evaluator Service

```bash
cd backend/services/project-evaluator

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Set OpenAI API Key

Edit `backend/services/project-evaluator/.env`:

```env
OPENAI_API_KEY=sk_...  # Your OpenAI API key
OPENAI_MODEL=gpt-4o    # or gpt-4-turbo
EVALUATOR_PORT=8001
```

### 3. Configure Laravel Backend

The `.env` file already has:

```env
EVALUATOR_URL=http://127.0.0.1:8001
QUEUE_CONNECTION=database  # Uses database queue for jobs
```

## Running the System

### Option A: Individual Terminal Windows

**Terminal 1 - Backend API:**

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

**Terminal 2 - Queue Worker:**

```bash
cd backend
php artisan queue:work --tries=1
```

**Terminal 3 - Python Evaluator:**

```bash
cd backend/services/project-evaluator
venv\Scripts\activate  # Activate venv first
python main.py
```

**Terminal 4 - Frontend:**

```bash
cd frontend
npm run dev
```

### Option B: Single Command (Recommended)

```bash
cd backend
composer dev
```

This runs all services in parallel using `concurrently`.

## How It Works

### 1. Student Submits Task

**Frontend:** StudentTaskSubmitPage.tsx → POST `/student/tasks/{taskId}/submit`

```json
{
  "answer_text": "My solution code...",
  "attachment_url": "https://github.com/user/repo",
  "run_status": "Yes, it runs",
  "known_issues": "None"
}
```

**Response (immediate):**

```json
{
  "message": "Task submitted. Evaluating...",
  "submission": { "id": 123 }
}
```

### 2. Backend Processes Submission

`RoadmapService::submitTask()`:

- Creates `Submission` record with status='submitted'
- Dispatches `EvaluateSubmissionJob` to queue
- Returns immediately (async)

### 3. Queue Job Runs

`EvaluateSubmissionJob`:

- Fetches submission from database
- Calls `TaskEvaluationService::evaluateSubmission()`
- Updates submission with results

### 4. TaskEvaluationService

Calls Python evaluator service:

```php
POST http://127.0.0.1:8001/evaluate
Form data:
  - file (uploaded project file/zip)
  - project_description
  - student_language
  - student_run_status
  - known_issues
```

Stores results in `submissions` table:

- `ai_score` (0-100)
- `ai_feedback` (text feedback)
- `ai_metadata` (full JSON evaluation)
- `is_evaluated` (true when complete)
- `evaluated_at` (timestamp)

### 5. Frontend Polls for Results

`StudentTaskSubmitPage.tsx`:

- Polls `GET /student/submissions/{submissionId}` every 2 seconds
- Displays "Evaluating..." while `is_evaluated=false`
- Shows detailed results when complete

**Response format:**

```json
{
  "data": {
    "id": 123,
    "ai_score": 85,
    "ai_feedback": "✅ Passed\nFunctional: 60/70...",
    "ai_metadata": {
      "passed": true,
      "functional_score": 60,
      "code_quality_score": 25,
      "total_score": 85,
      "developer_assessment": {
        "estimated_level": "mid",
        "strengths": ["Clean code", "Good structure"],
        "weaknesses": ["Missing tests"]
      },
      ...
    },
    "is_evaluated": true,
    "evaluated_at": "2025-12-14T10:30:45Z"
  }
}
```

## Database Schema

### Submissions Table

```sql
ALTER TABLE submissions ADD (
  ai_score TINYINT UNSIGNED NULL,
  ai_feedback LONGTEXT NULL,
  ai_metadata JSON NULL,
  is_evaluated BOOLEAN DEFAULT FALSE,
  evaluated_at TIMESTAMP NULL
);
```

## Files Changed/Created

### Backend

**New Files:**

- `app/Jobs/EvaluateSubmissionJob.php` - Queue job for async evaluation
- `app/Modules/AI/Application/Services/TaskEvaluationService.php` - AI service
- `config/services.php` - Updated with evaluator config
- `database/migrations/2025_12_14_000000_add_ai_evaluation_to_submissions_table.php`
- `backend/services/project-evaluator/` - Complete Python FastAPI service

**Modified Files:**

- `app/Modules/Learning/Application/Services/RoadmapService.php`
  - Updated `submitTask()` to dispatch evaluation job
- `app/Modules/Learning/Interface/Http/Controllers/TaskController.php`
  - Added `getSubmission()` endpoint
  - Updated `submit()` to accept evaluation metadata
- `app/Modules/Learning/Infrastructure/Models/Submission.php`
  - Added fillable: `ai_score`, `ai_metadata`, `is_evaluated`
  - Added casts for AI fields
- `app/Modules/Learning/Interface/routes.php`
  - Added `GET /student/submissions/{submission}` route
- `.env`
  - Added `EVALUATOR_URL=http://127.0.0.1:8001`

### Frontend

**Modified Files:**

- `src/pages/student/StudentTaskSubmitPage.tsx`
  - Added polling for evaluation results
  - Added form fields for run_status and known_issues
  - Display detailed evaluation feedback component
  - Show progress while evaluating

## API Endpoints

### Student Routes

```
POST   /api/student/tasks/{taskId}/submit
       → Submit task, get submission ID

GET    /api/student/submissions/{submissionId}
       → Fetch submission with evaluation results
       → Returns is_evaluated flag and full metadata
```

### Admin Routes (for monitoring)

```
GET    /api/admin/learning/blocks/{blockId}/tasks/{taskId}/submissions
       → List all submissions for a task (future)

GET    /api/admin/learning/blocks/{blockId}/tasks/{taskId}/submissions/{submissionId}
       → View submission details (future)
```

## Configuration

### Laravel .env

```env
# Queue driver (important for async evaluation)
QUEUE_CONNECTION=database

# Evaluator service
EVALUATOR_URL=http://127.0.0.1:8001
```

### Python .env

```env
OPENAI_API_KEY=sk_...
OPENAI_MODEL=gpt-4o
EVALUATOR_PORT=8001
```

## Troubleshooting

### Evaluator service not running

```bash
# Check if port 8001 is in use
netstat -ano | findstr :8001

# Or try different port in .env
EVALUATOR_PORT=8002
```

### Queue jobs not processing

```bash
# Check queue driver
php artisan config:clear

# Run queue worker in debug mode
php artisan queue:work --verbose

# Check failed jobs
php artisan queue:failed
```

### OpenAI API errors

```bash
# Test API key
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer sk_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"test"}]}'
```

### Evaluation never completes

Check:

1. Queue worker is running (`php artisan queue:work`)
2. Evaluator service is running (`python main.py`)
3. Check logs: `storage/logs/laravel.log`
4. Check failed jobs: `php artisan queue:failed`

## Performance Notes

- Evaluations typically take 10-30 seconds depending on code size
- Frontend polls every 2 seconds (configurable in `StudentTaskSubmitPage.tsx`)
- Python evaluator uses streaming responses for faster feedback
- Database queue is suitable for <100 concurrent evaluations

For production:

- Consider Redis queue instead of database
- Implement WebSocket for real-time updates
- Cache evaluator responses for identical submissions
- Rate-limit API to prevent abuse

## Testing

### Manual Test

1. Login as student
2. Navigate to a task
3. Submit solution with GitHub link
4. Watch for "Evaluating..." message
5. Wait for results (10-30 seconds)

### Test Evaluator Service Directly

```bash
curl -X POST http://127.0.0.1:8001/evaluate \
  -F "file=@project.zip" \
  -F "project_description=Build a TODO app" \
  -F "student_language=React + TypeScript" \
  -F "student_run_status=Yes, it runs" \
  -F "known_issues=None"
```

### Test Health Check

```bash
curl http://127.0.0.1:8001/health
```

## Security Considerations

1. **File upload validation** - Evaluator filters dangerous files
2. **API key security** - Store in .env, never in version control
3. **Rate limiting** - Consider adding to prevent API abuse
4. **Access control** - Students can only see their own submissions
5. **Data privacy** - Code is sent to OpenAI; consider privacy implications

## Future Enhancements

- [ ] WebSocket for real-time evaluation updates
- [ ] Batch evaluation for multiple tasks
- [ ] Caching to avoid re-evaluating identical code
- [ ] Custom evaluation criteria per task
- [ ] Webhook notifications when evaluation completes
- [ ] Admin dashboard showing evaluation metrics
- [ ] Integration with portfolio generation
- [ ] Historical comparison of student progress
