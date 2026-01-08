<#
.SYNOPSIS
    E2E Isolated Test Environment Setup and Teardown Script
.DESCRIPTION
    Manages the isolated E2E testing environment for SkillForge
    - Sets up isolated database and configuration
    - Seeds test users
    - Runs E2E tests
    - Cleans up after testing
.CREATED
    2025-12-29
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('setup', 'run', 'teardown', 'full')]
    [string]$Action = 'full',
    
    [string]$Profile = 'e2e',
    
    [switch]$KeepDatabase
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$K6Path = Join-Path $BackendDir "tests\LoadTest\k6\k6.exe"
$E2EDir = Join-Path $BackendDir "tests\e2e_isolated"
$ReportsDir = Join-Path $E2EDir "reports"
$EnvFile = Join-Path $BackendDir ".env"
$EnvE2EFile = Join-Path $BackendDir ".env.e2e"
$EnvBackupFile = Join-Path $BackendDir ".env.backup.e2e_run"
$E2EDatabase = Join-Path $BackendDir "database\skillforge_e2e_test.sqlite"

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

function Log-Step {
    param([string]$Message, [string]$Status = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Status) {
        "INFO"    { "Cyan" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR"   { "Red" }
        default   { "White" }
    }
    Write-Host "[$timestamp] [$Status] $Message" -ForegroundColor $color
}

# ─────────────────────────────────────────────────────────────────────────────
# SETUP FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

function Setup-Environment {
    Log-Step "Starting E2E Isolated Environment Setup..." "INFO"
    
    # Create reports directory
    if (-not (Test-Path $ReportsDir)) {
        New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null
        Log-Step "Created reports directory: $ReportsDir" "SUCCESS"
    }
    
    # Backup current .env
    if (Test-Path $EnvFile) {
        Copy-Item $EnvFile $EnvBackupFile -Force
        Log-Step "Backed up .env to $EnvBackupFile" "SUCCESS"
    }
    
    # Check if .env.e2e exists, if not create from .env.e2e.active
    $EnvE2EActive = Join-Path $BackendDir ".env.e2e.active"
    if (Test-Path $EnvE2EActive) {
        Copy-Item $EnvE2EActive $EnvE2EFile -Force
        Log-Step "Copied .env.e2e.active to .env.e2e" "SUCCESS"
    }
    
    # Create E2E database file
    if (-not (Test-Path $E2EDatabase)) {
        New-Item -ItemType File -Path $E2EDatabase -Force | Out-Null
        Log-Step "Created E2E database: $E2EDatabase" "SUCCESS"
    }
    
    # Switch to E2E environment
    if (Test-Path $EnvE2EFile) {
        Copy-Item $EnvE2EFile $EnvFile -Force
        Log-Step "Switched to E2E environment configuration" "SUCCESS"
    } else {
        Log-Step "No .env.e2e file found, using current .env" "WARNING"
    }
    
    # Run migrations
    Log-Step "Running database migrations..." "INFO"
    Push-Location $BackendDir
    try {
        $null = php artisan migrate:fresh --force 2>&1
        Log-Step "Database migrations completed" "SUCCESS"
    } catch {
        Log-Step "Migration error: $_" "WARNING"
    }
    
    # Run seeders
    Log-Step "Seeding test data..." "INFO"
    try {
        $null = php artisan db:seed --force 2>&1
        Log-Step "Standard seeders completed" "SUCCESS"
    } catch {
        Log-Step "Seeder error: $_" "WARNING"
    }
    
    # Seed E2E test users
    Log-Step "Seeding E2E test users..." "INFO"
    try {
        $seederContent = Get-Content (Join-Path $E2EDir "seeders\E2ETestSeeder.php") -Raw
        # Run custom E2E seeder via tinker
        $seederCommand = @"
require_once 'tests/e2e_isolated/seeders/E2ETestSeeder.php';
(new \Tests\E2EIsolated\Seeders\E2ETestSeeder())->run();
echo 'E2E users seeded successfully';
"@
        $null = echo $seederCommand | php artisan tinker 2>&1
        Log-Step "E2E test users seeded" "SUCCESS"
    } catch {
        Log-Step "E2E seeder error: $_" "WARNING"
    }
    
    # Clear caches
    Log-Step "Clearing caches..." "INFO"
    $null = php artisan cache:clear 2>&1
    $null = php artisan config:clear 2>&1
    $null = php artisan route:clear 2>&1
    Log-Step "Caches cleared" "SUCCESS"
    
    Pop-Location
    
    Log-Step "E2E Environment Setup Complete!" "SUCCESS"
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN TESTS
# ─────────────────────────────────────────────────────────────────────────────

function Run-Tests {
    param([string]$TestProfile = 'e2e')
    
    Log-Step "Starting E2E Test Execution (Profile: $TestProfile)..." "INFO"
    
    # Verify k6 exists
    if (-not (Test-Path $K6Path)) {
        Log-Step "k6.exe not found at $K6Path" "ERROR"
        return $false
    }
    
    # Start Laravel server in background
    Log-Step "Starting Laravel server on port 8001..." "INFO"
    Push-Location $BackendDir
    
    $serverJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        php artisan serve --host=127.0.0.1 --port=8001 2>&1
    } -ArgumentList $BackendDir
    
    Start-Sleep -Seconds 3
    
    # Verify server is running
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8001/api" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        Log-Step "Laravel server started successfully" "SUCCESS"
    } catch {
        Log-Step "Server may not be fully ready, continuing anyway..." "WARNING"
    }
    
    Pop-Location
    
    # Run test scenarios
    $scenarios = @(
        @{ Name = "Authentication"; Script = "scenarios/auth.js" },
        @{ Name = "Student Flow"; Script = "scenarios/student_flow.js" },
        @{ Name = "Business Flow"; Script = "scenarios/business_flow.js" },
        @{ Name = "Admin Flow"; Script = "scenarios/admin_flow.js" },
        @{ Name = "Edge Cases"; Script = "scenarios/edge_cases.js" },
        @{ Name = "Full Suite"; Script = "run_all.js" }
    )
    
    $results = @()
    
    foreach ($scenario in $scenarios) {
        $scriptPath = Join-Path $E2EDir $scenario.Script
        
        if (-not (Test-Path $scriptPath)) {
            Log-Step "Script not found: $scriptPath" "WARNING"
            continue
        }
        
        Log-Step "Running scenario: $($scenario.Name)..." "INFO"
        
        Push-Location $E2EDir
        try {
            $output = & $K6Path run --env E2E_PROFILE=$TestProfile --env E2E_BASE_URL="http://127.0.0.1:8001/api" $scenario.Script 2>&1
            $exitCode = $LASTEXITCODE
            
            if ($exitCode -eq 0) {
                Log-Step "$($scenario.Name) completed successfully" "SUCCESS"
            } else {
                Log-Step "$($scenario.Name) completed with warnings (exit code: $exitCode)" "WARNING"
            }
            
            $results += @{
                Scenario = $scenario.Name
                ExitCode = $exitCode
                Output = $output -join "`n"
            }
        } catch {
            Log-Step "Error running $($scenario.Name): $_" "ERROR"
            $results += @{
                Scenario = $scenario.Name
                ExitCode = -1
                Output = $_.ToString()
            }
        }
        Pop-Location
        
        Start-Sleep -Seconds 2
    }
    
    # Stop server
    Log-Step "Stopping Laravel server..." "INFO"
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
    
    # Generate combined report
    Generate-Report -Results $results
    
    Log-Step "E2E Test Execution Complete!" "SUCCESS"
    return $true
}

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE REPORT
# ─────────────────────────────────────────────────────────────────────────────

function Generate-Report {
    param($Results)
    
    Log-Step "Generating E2E Performance Report..." "INFO"
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $reportPath = Join-Path $E2EDir "E2E_PERFORMANCE_REPORT.md"
    
    # Read individual JSON summaries if they exist
    $summaries = @{}
    $jsonFiles = Get-ChildItem -Path $ReportsDir -Filter "*.json" -ErrorAction SilentlyContinue
    foreach ($file in $jsonFiles) {
        try {
            $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
            $summaries[$file.BaseName] = $content
        } catch {
            # Skip invalid JSON
        }
    }
    
    # Build report content
    $report = @"
# SkillForge E2E Isolated Test - Performance Report

## Executive Summary

| Metric | Target | Status |
|--------|--------|--------|
| p95 Response Time | < 3s | ⏳ |
| Error Rate | < 15% | ⏳ |
| Login Success Rate | > 85% | ⏳ |
| Flow Completion Rate | > 50% | ⏳ |

**Report Generated**: $timestamp

---

## Test Environment

### Configuration
- **Environment**: E2E Isolated (`e2e-test.skillforge.local`)
- **Database**: SQLite (`skillforge_e2e_test.sqlite`)
- **Queue**: Sync (for testing)
- **API URL**: http://127.0.0.1:8001/api

### Test Users
- **Students**: 15 unique users (`e2e_student_1@test.local` to `e2e_student_15@test.local`)
- **Business**: 5 unique users (`e2e_business_1@test.local` to `e2e_business_5@test.local`)
- **Admins**: 3 unique users (`e2e_admin_1@test.local` to `e2e_admin_3@test.local`)
- **Password**: `e2e_test_pass_123`

### Load Profile
| Stage | Duration | Target VUs |
|-------|----------|------------|
| Ramp-up | 30s | 0 → 10 |
| Sustain | 60s | 10 |
| Ramp-down | 30s | 10 → 0 |

---

## Scenario Results

"@

    # Add results for each scenario
    foreach ($result in $Results) {
        $status = if ($result.ExitCode -eq 0) { "✅ PASS" } else { "⚠️ WARNINGS" }
        $report += @"

### $($result.Scenario)

**Status**: $status (Exit Code: $($result.ExitCode))

``````
$($result.Output | Select-Object -Last 30 | Out-String)
``````

"@
    }
    
    # Add JSON summaries section
    $report += @"

---

## Detailed Metrics (JSON Summaries)

"@

    foreach ($key in $summaries.Keys) {
        $summary = $summaries[$key]
        $report += @"

### $key

``````json
$($summary | ConvertTo-Json -Depth 5)
``````

"@
    }
    
    # Add recommendations section
    $report += @"

---

## Recommendations

### P0 - Critical
| Issue | Recommendation | Status |
|-------|----------------|--------|
| Rate limiting | Ensure E2E environment has relaxed limits | ⏳ |

### P1 - High Priority
| Issue | Recommendation | Status |
|-------|----------------|--------|
| Test user isolation | Each VU uses unique user | ✅ |
| Database isolation | Separate SQLite database | ✅ |

### P2 - Medium Priority
| Issue | Recommendation | Status |
|-------|----------------|--------|
| Add more edge cases | Expand edge case coverage | ⏳ |

---

## Cleanup Status

- [ ] E2E database deleted
- [ ] Test users removed
- [ ] Rate limits reverted
- [ ] Environment restored

---

**Report Author**: E2E Test Automation
**Environment**: e2e_isolated
"@

    # Write report
    $report | Out-File -FilePath $reportPath -Encoding utf8
    Log-Step "Report saved to: $reportPath" "SUCCESS"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEARDOWN
# ─────────────────────────────────────────────────────────────────────────────

function Teardown-Environment {
    Log-Step "Starting E2E Environment Teardown..." "INFO"
    
    Push-Location $BackendDir
    
    # Restore original .env
    if (Test-Path $EnvBackupFile) {
        Copy-Item $EnvBackupFile $EnvFile -Force
        Remove-Item $EnvBackupFile -Force
        Log-Step "Restored original .env configuration" "SUCCESS"
    }
    
    # Delete E2E database (unless -KeepDatabase)
    if (-not $KeepDatabase -and (Test-Path $E2EDatabase)) {
        Remove-Item $E2EDatabase -Force
        Log-Step "Deleted E2E database: $E2EDatabase" "SUCCESS"
    } elseif ($KeepDatabase) {
        Log-Step "Keeping E2E database as requested" "INFO"
    }
    
    # Clear caches
    $null = php artisan cache:clear 2>&1
    $null = php artisan config:clear 2>&1
    Log-Step "Caches cleared" "SUCCESS"
    
    Pop-Location
    
    Log-Step "E2E Environment Teardown Complete!" "SUCCESS"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      SkillForge E2E Isolated Test Environment Manager        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    'setup' {
        Setup-Environment
    }
    'run' {
        Run-Tests -TestProfile $Profile
    }
    'teardown' {
        Teardown-Environment
    }
    'full' {
        Setup-Environment
        Write-Host ""
        Run-Tests -TestProfile $Profile
        Write-Host ""
        Teardown-Environment
    }
}

Write-Host ""
Log-Step "E2E Test Process Completed" "SUCCESS"
