<#
PowerShell smoke test for Project Evaluator

Usage:
  .\smoke_test.ps1            # uses default http://127.0.0.1:8001
  $env:EVALUATOR_URL = 'http://127.0.0.1:8001' ; .\smoke_test.ps1

Exits with non-zero code on failure. Uses Invoke-RestMethod (recommended) which avoids common curl.exe quoting issues.
#>

param(
  [string]$BaseUrl = $env:EVALUATOR_URL -or 'http://127.0.0.1:8001'
)

$payload = @{
  repo_url = "https://github.com/example/repo"
  answer_text = "test"
  student_run_status = "npm install; npm run dev"
  task_title = "t"
  task_description = "d"
}

function Fail([string]$msg) {
  Write-Host $msg -ForegroundColor Red
  exit 1
}

Write-Host "Testing evaluator at: $BaseUrl" -ForegroundColor Cyan

# Health check
try {
  Write-Host "GET $BaseUrl/health ..."
  $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -ContentType 'application/json' -ErrorAction Stop
  Write-Host "HEALTH: " ($health | ConvertTo-Json -Depth 5)
} catch {
  Fail "Health check failed: $_"
}

# Evaluation
try {
  Write-Host "POST $BaseUrl/evaluate ..."
  $json = $payload | ConvertTo-Json -Depth 5
  $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/evaluate" -ContentType 'application/json' -Body $json -ErrorAction Stop
  Write-Host "EVALUATE RESPONSE: " ($resp | ConvertTo-Json -Depth 5)
  if (-not $resp.success) {
    Fail "Evaluation API returned a failure response"
  }
  Write-Host "Evaluation succeeded" -ForegroundColor Green
  exit 0
} catch {
  Fail "Evaluate request failed: $_"
}
