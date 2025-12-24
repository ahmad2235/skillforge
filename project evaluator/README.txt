# Project Evaluator 

FastAPI service that evaluates a student project using OpenAI GPT-5.1.

## Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration (PowerShell)

# Create .env from the example
Copy-Item .env.example .env

# Edit .env and set your keys (do NOT share or commit .env)
# Use notepad .env to safely paste your key.
# Required variables: AI_ENABLED, OPENAI_API_KEY, OPENAI_MODEL
# Optional: OPENAI_TIMEOUT_SECONDS, OPENAI_MAX_RETRIES

# Run a local smoke test to verify key & model
python -m evaluator.smoke_test

## Security: No Code Execution ⚠️

- The evaluator treats `student_run_status` as plain text only and will never execute it or any user-provided commands.
- `repo_url` is validated to only allow GitHub repository URLs of the form `https://github.com/owner/repo`.
- Invalid JSON payloads return HTTP 400 with `{ "success": false, "error": { "reason": "json_invalid", ... } }`.
- If the evaluator is disabled or misconfigured, the service returns a safe manual-review fallback (no provider calls).

Note: This design ensures user-provided inputs are never run on the evaluator host and avoids accidental `npm` or `git` execution.

## Run service (PowerShell)

# Start uvicorn
venv\Scripts\python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001

## Verify endpoints (PowerShell examples)

# Recommended: use Invoke-RestMethod (handles JSON safely)
$payload = @{ repo_url = 'https://github.com/example/repo'; task_title = 'Task'; answer_text = 'Implemented feature X'; task_description = 'Do X' }
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8001/evaluate' -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 5)

# Alternatively, using curl.exe safely from PowerShell (avoid unquoted here-strings):
# Option A: write JSON to a file then post it
($payload | ConvertTo-Json -Depth 5) | Set-Content -Path body.json -NoNewline -Encoding utf8
curl.exe -v -X POST "http://127.0.0.1:8001/evaluate" -H "Content-Type: application/json" --data-binary "@body.json"

# Option B: pipe JSON and use --data-binary @-
($payload | ConvertTo-Json -Depth 5) | curl.exe -v -X POST "http://127.0.0.1:8001/evaluate" -H "Content-Type: application/json" --data-binary @-

# Notes & troubleshooting
- PowerShell can split arguments when calling external exes (for example unquoted semicolons in a here-string), which may result in truncated requests or extra hostnames; prefer Invoke-RestMethod or use one of the safe curl patterns above.
- If the server returns HTTP 400 with reason `content_length_mismatch`, the Content-Length header does not match the actual body length — this is commonly caused by incorrect curl usage from PowerShell. Use the safe patterns above.
- Invalid JSON returns HTTP 400 with reason `json_invalid`.

# Expected success JSON (on a real OpenAI response):
# {"success": true, "data": {"status":"succeeded","semantic_status":"completed","score":85,"feedback":"...","meta":{"reason":null}}}

# Expected error when AI is disabled by config (HTTP 200 fallback with manual review):
# {"success": true, "data": {"status":"failed","semantic_status":"manual_review","score":null,...}}

# Expected provider error (HTTP 502) e.g. missing or invalid key:
# {"success": false, "error": {"type":"provider_error","reason":"missing_key|auth_invalid|rate_limited|timeout","message":"..."}}

