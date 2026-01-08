# SkillForge k6 Load Testing Suite

A comprehensive load testing setup for the SkillForge Laravel API, designed to identify performance bottlenecks in placement tests, task submissions, and evaluation polling.

## Prerequisites

1. **Install k6** (Windows):
   ```powershell
   # Using Chocolatey
   choco install k6

   # Or download from https://k6.io/docs/get-started/installation/
   winget install k6 --source winget
   ```

2. **Backend Running**:
   ```powershell
   cd backend
   composer dev
   ```

3. **Queue Workers Active** (important for evaluation tests):
   ```powershell
   php artisan queue:work --tries=3
   ```

## Quick Start

### 1. Configure Test Settings

Edit `config.js` to match your environment:

```javascript
export const CONFIG = {
  BASE_URL: 'http://localhost:8000/api',  // Your Laravel API URL
  
  TEST_USERS: {
    student: {
      email: 'test@student.com',
      password: 'password123',
    },
    // ...
  },
  
  TEST_DATA: {
    taskId: 1,      // Valid task ID in your database
    blockId: 1,     // Valid block ID
    roadmapId: 1,   // Valid roadmap ID
  },
};
```

### 2. Run Tests

```powershell
cd backend/tests/LoadTest/k6

# Smoke test (quick validation)
k6 run --env K6_PROFILE=smoke scenarios/mixed.js

# Full load test
k6 run --env K6_PROFILE=load scenarios/mixed.js

# Stress test (find breaking point)
k6 run --env K6_PROFILE=stress scenarios/mixed.js
```

## Test Scenarios

### Scenario A: Placement Submission (`placement.js`)
Tests the placement assessment flow:
1. Login
2. Fetch placement questions
3. Submit answers
4. Verify result

```powershell
k6 run --env K6_PROFILE=load scenarios/placement.js
```

### Scenario B: Task Submission (`submission.js`)
Tests task submission which triggers async evaluation:
1. Login
2. Get roadmap
3. Get task details
4. Submit task
5. Verify submission created

```powershell
k6 run --env K6_PROFILE=load scenarios/submission.js
```

### Scenario C: Evaluation Polling (`polling.js`)
**Critical for detecting stuck loops**. Tests the polling behavior:
1. Submit a task
2. Poll for evaluation status repeatedly
3. Detect stuck 200/204 loops
4. Measure time to completion

```powershell
k6 run --env K6_PROFILE=load scenarios/polling.js
```

Key metrics to watch:
- `stuck_loop_rate` - Should be < 5%
- `evaluation_total_time_ms` - p95 should be < 60s
- `polls_to_completion` - Average should be < 20

### Scenario D: Mixed Load (`mixed.js`)
Realistic concurrent traffic simulation:
- 30% Placement tests
- 40% Task submissions
- 20% Polling
- 10% General browsing

```powershell
k6 run --env K6_PROFILE=load scenarios/mixed.js
```

## Load Profiles

| Profile | Description | Peak VUs | Duration |
|---------|-------------|----------|----------|
| `smoke` | Quick validation | 5 | 1 min |
| `load` | Normal load test | 100 | 15 min |
| `stress` | Find breaking point | 300 | 20 min |
| `spike` | Sudden traffic spike | 500 | 10 min |
| `soak` | Endurance test | 50 | 2 hours |

Usage:
```powershell
k6 run --env K6_PROFILE=stress scenarios/mixed.js
```

## Custom Metrics

The suite tracks these custom metrics:

| Metric | Description |
|--------|-------------|
| `placement_submit_duration` | Time to submit placement |
| `placement_success_rate` | Placement success rate |
| `task_submit_duration` | Time to submit task |
| `task_submit_success` | Task submit success rate |
| `evaluation_duration` | Total evaluation time |
| `evaluation_success` | Successful evaluations |
| `evaluation_stuck` | Stuck loop detections |
| `evaluation_timeout` | Evaluation timeouts |
| `polling_requests` | Total polling requests |

## Thresholds

Tests will fail if these thresholds are exceeded:

| Metric | Threshold |
|--------|-----------|
| p95 Response Time | < 2000ms |
| Error Rate | < 1% |
| Placement p95 | < 3000ms |
| Task Submit p95 | < 2000ms |
| Evaluation p95 | < 30000ms |
| Stuck Loop Rate | < 5% |

## Output & Reporting

### JSON Output
```powershell
k6 run --out json=results.json scenarios/mixed.js
```

### HTML Report (with k6-reporter)
```powershell
k6 run --out json=results.json scenarios/mixed.js
# Then use k6-reporter to generate HTML
```

### InfluxDB + Grafana
```powershell
k6 run --out influxdb=http://localhost:8086/k6 scenarios/mixed.js
```

### Console Summary
The default output shows a summary like:
```
     ✓ authentication successful
     ✓ placement submit 200
     ✓ task submit ok

     checks.........................: 98.5% ✓ 2847  ✗ 43
     http_req_duration..............: avg=245ms min=12ms med=189ms max=4521ms p(90)=456ms p(95)=892ms
     http_req_failed................: 0.85% ✓ 25    ✗ 2890
     vus............................: 100   min=1   max=100
```

## Troubleshooting

### "Cannot authenticate test user"
1. Ensure the test user exists in your database
2. Check `config.js` credentials match
3. Verify Laravel is running: `curl http://localhost:8000/api/auth/login`

### High stuck_loop_rate
This indicates the evaluation system is not processing submissions:
1. Check queue workers are running: `php artisan queue:work`
2. Check Redis/database queue is accessible
3. Review Laravel logs: `storage/logs/laravel.log`

### All requests timing out
1. Check Laravel is running
2. Check `BASE_URL` in `config.js`
3. Increase `TIMING.requestTimeoutMs` if network is slow

### "Too many open files" errors
On high VU counts:
```powershell
# Windows: Increase max connections
netsh int ipv4 set dynamicport tcp start=1025 num=64510
```

## File Structure

```
tests/LoadTest/k6/
├── config.js              # Central configuration
├── utils.js               # Helper functions & metrics
├── scenarios/
│   ├── placement.js       # Scenario A: Placement flow
│   ├── submission.js      # Scenario B: Task submission
│   ├── polling.js         # Scenario C: Polling stress
│   └── mixed.js           # Scenario D: Mixed load
├── PERFORMANCE_REPORT.md  # Report template
└── README.md              # This file
```

## Next Steps After Testing

1. Fill out `PERFORMANCE_REPORT.md` with results
2. Identify P0/P1/P2 issues
3. Review stuck loop detections
4. Check evaluation duration distribution
5. Plan capacity improvements

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Metrics Reference](https://k6.io/docs/using-k6/metrics/)
- [Laravel Queue Documentation](https://laravel.com/docs/queues)
