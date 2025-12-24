# Evaluator API Robustness Fixes — Summary

## Changes Made

### 1. Request Schema (main.py)
**Changed:** `EvaluateRequest` model
- Made `repo_url` **REQUIRED** (was optional)
- Made all other fields (`answer_text`, `student_run_status`, `task_title`, `task_description`, `known_issues`) **OPTIONAL** with default value `""`
- **Removed** validation that required `repo_url OR answer_text` — now only `repo_url` is required

### 2. AI-Disabled Response Format (main.py)
**Changed:** Response when AI is disabled or API key is missing
- **Old format:**
  ```json
  {
    "success": true,
    "data": {
      "status": "failed",
      "semantic_status": "manual_review",
      "score": null,
      "feedback": "...",
      "meta": {...}
    }
  }
  ```
- **New format:**
  ```json
  {
    "success": true,
    "data": {
      "total_score": 0,
      "passed": false,
      "summary": "AI evaluation is disabled. Manual review required.",
      "ai_disabled": true
    }
  }
  ```

### 3. Provider Malformed Handling (evaluator/openai_client.py)
**Changed:** When OpenAI returns empty/no content
- **Before:** Raised `OpenAIError("provider_malformed", ...)` → 502 error
- **After:**
  1. Retry the request once automatically
  2. If still empty, return safe fallback JSON:
     ```json
     {
       "total_score": 0,
       "passed": false,
       "summary": "AI evaluation failed: provider returned no content.",
       "provider_malformed": true
     }
     ```
  3. This becomes HTTP 200 success response with `provider_malformed: true` flag

### 4. Successful Evaluation Response Format (main.py)
**Changed:** Response when AI completes successfully
- **Old format:**
  ```json
  {
    "success": true,
    "data": {
      "status": "succeeded",
      "semantic_status": "completed",
      "score": 90,
      "feedback": "...",
      "meta": {...},
      "raw": {...}
    }
  }
  ```
- **New format:**
  ```json
  {
    "success": true,
    "data": {
      "total_score": 85,
      "passed": true,
      "summary": "...",
      "ai_disabled": false
    }
  }
  ```

### 5. Test Updates
**Updated:** tests/test_main.py and tests/test_json_handling.py
- All tests now expect new response format
- Added `sys.path` workaround for imports
- Tests verify:
  - AI disabled returns HTTP 200 with `ai_disabled: true`
  - Missing key returns HTTP 200 with `ai_disabled: true`
  - Invalid auth still returns HTTP 502 with `reason: "auth_invalid"`
  - Successful evaluation returns HTTP 200 with proper fields
  - Only `repo_url` is required in requests

## Files Modified

1. **project evaluator/main.py**
   - Request schema: only `repo_url` required
   - AI-disabled response format
   - Successful evaluation response format
   - Variable extraction logic

2. **project evaluator/evaluator/openai_client.py**
   - Provider malformed retry logic
   - Safe fallback JSON instead of exception

3. **project evaluator/tests/test_main.py**
   - Import fixes (sys.path)
   - Response format assertions
   - Test URLs updated to valid GitHub format
   - Test client setup

4. **project evaluator/tests/test_json_handling.py**
   - Response format assertions

## Testing

### Run all tests:
```powershell
python -m pytest -q "project evaluator/tests/test_main.py" "project evaluator/tests/test_json_handling.py"
```

**Result:** ✅ 10 passed, 10 warnings

### Test POST /evaluate (PowerShell):
```powershell
# Minimal request (only repo_url required)
$payload = @{ repo_url = "https://github.com/example/repo" }
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8001/evaluate" -ContentType "application/json" -Body ($payload | ConvertTo-Json)

# Full request with all fields
$payload = @{
  repo_url = "https://github.com/example/repo"
  answer_text = "Implemented feature X"
  student_run_status = "npm install; npm run dev"
  task_title = "Build a REST API"
  task_description = "Create endpoints for CRUD operations"
  known_issues = "None"
}
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8001/evaluate" -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 5)
```

### Using curl.exe safely:
```powershell
# Option A: Write to file
$payload | ConvertTo-Json -Depth 5 | Set-Content -Path body.json -NoNewline -Encoding utf8
curl.exe -X POST "http://127.0.0.1:8001/evaluate" -H "Content-Type: application/json" --data-binary "@body.json"

# Option B: Pipe
$payload | ConvertTo-Json -Depth 5 | curl.exe -X POST "http://127.0.0.1:8001/evaluate" -H "Content-Type: application/json" --data-binary @-
```

## Behavior Summary

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| AI disabled | HTTP 200, complex meta | HTTP 200, simple {total_score: 0, ai_disabled: true} |
| Missing API key | HTTP 200, complex meta | HTTP 200, simple {total_score: 0, ai_disabled: true} |
| Provider returns no content | HTTP 502 provider_malformed | Retry once, then HTTP 200 {total_score: 0, provider_malformed: true} |
| Invalid auth | HTTP 502 auth_invalid | HTTP 502 auth_invalid (unchanged) |
| Successful evaluation | HTTP 200, complex structure | HTTP 200, simple {total_score, passed, summary, ai_disabled: false} |
| Request with only repo_url | HTTP 400 missing_input | HTTP 200 (accepted) |
| Request missing repo_url | HTTP 422 | HTTP 422 validation_error (unchanged) |

## Key Improvements

1. **No more 422s for minimal requests** — Only `repo_url` is required
2. **No more provider_malformed 502s** — Retry + fallback to HTTP 200
3. **Simpler response format** — Consistent `{total_score, passed, summary, ai_disabled}` schema
4. **Better resilience** — Auto-retry on empty provider responses
5. **PowerShell-friendly** — Works with minimal `{"repo_url": "..."}` payloads
