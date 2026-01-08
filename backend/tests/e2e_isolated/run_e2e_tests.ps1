# SkillForge E2E Test Runner
# This script runs all E2E tests sequentially, restarting the server between tests
# to avoid PHP dev server crashes under load

$ErrorActionPreference = "Continue"
$BackendPath = "c:\Users\ahmad\Desktop\skillforge\backend"
$E2EPath = "$BackendPath\tests\e2e_isolated"
$K6Path = "$BackendPath\tests\LoadTest\k6\k6.exe"
$ReportsPath = "$E2EPath\reports"
$Port = 8002

# Create reports directory
New-Item -ItemType Directory -Path $ReportsPath -Force | Out-Null

# Results tracking
$results = @{
    auth = $null
    student = $null
    business = $null
    admin = $null
    edge_cases = $null
}

function Start-E2EServer {
    param([int]$Port)
    
    # Kill any existing PHP processes on our port
    $existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Port $Port in use, killing existing process..."
        Stop-Process -Id (Get-Process -Id $existing.OwningProcess).Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    Write-Host "Starting Laravel E2E server on port $Port..."
    Push-Location $BackendPath
    $process = Start-Process -FilePath "php" -ArgumentList "artisan","serve","--host=127.0.0.1","--port=$Port" -NoNewWindow -PassThru
    Pop-Location
    
    # Wait for server to be ready
    $maxWait = 30
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 1
        $waited++
        $test = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
        if ($test.TcpTestSucceeded) {
            Write-Host "Server ready on port $Port (waited ${waited}s)"
            return $process
        }
    }
    
    Write-Host "ERROR: Server failed to start within ${maxWait}s" -ForegroundColor Red
    return $null
}

function Stop-E2EServer {
    param($Process)
    if ($Process -and -not $Process.HasExited) {
        Write-Host "Stopping server (PID: $($Process.Id))..."
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    # Also kill any orphaned PHP processes
    Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Run-Scenario {
    param(
        [string]$Name,
        [string]$ScriptPath,
        [string]$Profile = "smoke"
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Running: $Name" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $jsonOutput = "$ReportsPath\${Name}_summary.json"
    
    $startTime = Get-Date
    
    & $K6Path run `
        --env "E2E_BASE_URL=http://127.0.0.1:$Port/api" `
        --env "E2E_PROFILE=$Profile" `
        --summary-export=$jsonOutput `
        $ScriptPath
    
    $exitCode = $LASTEXITCODE
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    $result = @{
        scenario = $Name
        exitCode = $exitCode
        duration = [math]::Round($duration, 2)
        jsonFile = $jsonOutput
        passed = ($exitCode -eq 0)
    }
    
    if ($exitCode -eq 0) {
        Write-Host "✓ $Name PASSED (${duration}s)" -ForegroundColor Green
    } else {
        Write-Host "✗ $Name FAILED (exit code: $exitCode)" -ForegroundColor Red
    }
    
    return $result
}

# Main execution
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║       SkillForge E2E Load Test Suite                       ║" -ForegroundColor Yellow
Write-Host "║       Running with smoke profile (2 VUs, quick tests)      ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

$overallStart = Get-Date

# Check if E2E environment is active
Push-Location $BackendPath
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "APP_ENV=e2e_testing") {
    Write-Host "WARNING: APP_ENV is not set to e2e_testing!" -ForegroundColor Yellow
    Write-Host "Run: Copy-Item .env.e2e.active .env -Force" -ForegroundColor Yellow
}
Pop-Location

# Test 1: Auth
$server = Start-E2EServer -Port $Port
if ($server) {
    $results.auth = Run-Scenario -Name "auth" -ScriptPath "$E2EPath\scenarios\auth.js" -Profile "smoke"
    Stop-E2EServer -Process $server
}

# Test 2: Student Flow
$server = Start-E2EServer -Port $Port
if ($server) {
    $results.student = Run-Scenario -Name "student_flow" -ScriptPath "$E2EPath\scenarios\student_flow.js" -Profile "smoke"
    Stop-E2EServer -Process $server
}

# Test 3: Business Flow
$server = Start-E2EServer -Port $Port
if ($server) {
    $results.business = Run-Scenario -Name "business_flow" -ScriptPath "$E2EPath\scenarios\business_flow.js" -Profile "smoke"
    Stop-E2EServer -Process $server
}

# Test 4: Admin Flow
$server = Start-E2EServer -Port $Port
if ($server) {
    $results.admin = Run-Scenario -Name "admin_flow" -ScriptPath "$E2EPath\scenarios\admin_flow.js" -Profile "smoke"
    Stop-E2EServer -Process $server
}

# Test 5: Edge Cases
$server = Start-E2EServer -Port $Port
if ($server) {
    $results.edge_cases = Run-Scenario -Name "edge_cases" -ScriptPath "$E2EPath\scenarios\edge_cases.js" -Profile "smoke"
    Stop-E2EServer -Process $server
}

$overallEnd = Get-Date
$totalDuration = ($overallEnd - $overallStart).TotalSeconds

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║                    TEST RESULTS SUMMARY                     ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

$passed = 0
$failed = 0

foreach ($key in $results.Keys) {
    $r = $results[$key]
    if ($r) {
        if ($r.passed) {
            Write-Host "  ✓ $($r.scenario): PASSED ($($r.duration)s)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  ✗ $($r.scenario): FAILED (exit: $($r.exitCode))" -ForegroundColor Red
            $failed++
        }
    } else {
        Write-Host "  ? $key: NOT RUN" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Total: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Duration: $([math]::Round($totalDuration, 2))s"
Write-Host "Reports: $ReportsPath"

# Save results to JSON
$summaryPath = "$ReportsPath\test_summary.json"
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $summaryPath -Encoding UTF8
Write-Host "Summary saved to: $summaryPath"

# Return exit code based on results
if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
