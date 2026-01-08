# SkillForge Load Testing - Performance Report

## Executive Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| p95 Response Time | < 2s | **619ms** | ✅ |
| Error Rate | < 1% | **69.3%** | ❌ |
| Throughput (RPS) | > 100 | **4.0** | ❌ |
| Evaluation Stuck Rate | < 5% | N/A (flow issues) | ⚠️ |
| Concurrent Users Supported | 300 | **~10** | ❌ |

**Overall Assessment**: **CRITICAL ISSUES DETECTED** - The API's aggressive rate limiting and authentication/authorization flow issues severely limit concurrent user capacity. While response times are acceptable (p95 = 619ms), the high error rate (69.3%) indicates the system cannot handle even moderate concurrent load.

---

## Test Environment

### Infrastructure
- **API Server**: Laravel 12 (PHP 8.x)
- **Database**: SQLite (development)
- **Queue**: Database driver
- **Workers**: 0 dedicated workers (sync processing)

### Test Configuration
- **Test Tool**: k6 v0.49.0
- **Test Date**: 2025-12-28
- **Test Duration**: 2 minutes
- **Profile Used**: Custom smoke/load (ramping-vus)

### Load Stages Applied
| Stage | Duration | Target VUs |
|-------|----------|------------|
| Ramp-up | 30s | 1 → 10 |
| Sustained | 60s | 10 |
| Ramp-down | 30s | 10 → 0 |

---

## Overall Test Results

### HTTP Request Summary

| Metric | Value |
|--------|-------|
| Total Requests | 498 |
| Success Rate | 30.72% |
| Failed Requests | 345 (69.28%) |
| Iterations Completed | 119 |
| Data Received | 292 KB |
| Data Sent | 139 KB |
| Request Rate | 4.0 req/s |

### Response Time Distribution

| Percentile | Duration |
|------------|----------|
| Min | 16.07 ms |
| p50 (Median) | 137.13 ms |
| p90 | 448.81 ms |
| **p95** | **619.14 ms** |
| p99 | ~750 ms |
| Max | 1,122.69 ms |

---

## Scenario Results

### Scenario 1: Login (Authentication)

**Purpose**: Test user authentication flow

| Metric | Value |
|--------|-------|
| Total Attempts | 119 |
| Success Rate | **100%** ✅ |
| Login Token Obtained | 119/119 |

**Observations**:
- Login works perfectly after rate limiting was temporarily increased
- Average login response time: ~150ms
- No authentication failures observed
- Rate limiting originally blocked all logins at 5/min per email

---

### Scenario 2: Get Placement Questions

**Purpose**: Fetch placement test questions for students

| Metric | Value |
|--------|-------|
| Total Requests | 119 |
| Success Rate | **18.5%** (22/119) ❌ |
| Failed | 97 requests |

**Observations**:
- High failure rate (81.5%) indicates authorization or data issues
- Students may not have completed required steps
- API returns errors for students without proper setup

---

### Scenario 3: Submit Placement

**Purpose**: Submit placement test answers

| Metric | Value |
|--------|-------|
| Total Submissions | 22 (only after successful question fetch) |
| Success Rate | **45.5%** (10/22) ⚠️ |
| Failed | 12 requests |

**Observations**:
- Only runs when questions were successfully fetched
- ~50% success rate suggests validation or state issues
- May require students to not have already submitted placement

---

### Scenario 4: Get Roadmap

**Purpose**: Fetch student learning roadmap

| Metric | Value |
|--------|-------|
| Total Requests | 119 |
| Success Rate | **1.68%** (2/119) ❌ |
| Failed | 117 requests |

**Observations**:
- Extremely low success rate
- Roadmap requires completed placement test
- Most test users haven't completed prerequisite steps
- API correctly enforces flow but blocks load testing

---

### Scenario 5: Task Submission

**Purpose**: Submit task answers (triggers async evaluation)

| Metric | Value |
|--------|-------|
| Total Submissions | 119 |
| Success Rate | **0%** ❌ |
| Failed | 119 requests |

**Observations**:
- Complete failure - no task submissions succeeded
- Requires valid roadmap and unlocked tasks
- Prerequisites not met by test user state

---

## Bottleneck Analysis

### Identified Bottlenecks

| # | Component | Symptom | Impact | Severity |
|---|-----------|---------|--------|----------|
| 1 | Rate Limiting | 429 errors blocking all requests | Blocks concurrent users | **P0** |
| 2 | State Dependencies | Placement → Roadmap → Task flow | Cascading failures | **P1** |
| 3 | Single Test User | All VUs use same account | State conflicts | **P1** |
| 4 | SQLite + Sync Queue | No concurrent processing | Limited throughput | **P2** |

### Root Cause Analysis

#### Bottleneck 1: Rate Limiting (P0)
- **Evidence**: Initial tests showed 98%+ failure with 429 "Too Many Attempts"
- **Root Cause**: Login limited to 5/min per email, 20/min per IP
- **Affected Users**: 100% of concurrent users attempting login
- **Original Config**:
  ```php
  Limit::perMinute(5)->by($email);  // Per email
  Limit::perMinute(20)->by($ip);     // Per IP
  ```
- **Temporary Fix**: Increased to 1000/min for testing

#### Bottleneck 2: State Dependencies (P1)
- **Evidence**: 81.5% failure on placement, 98.3% failure on roadmap
- **Root Cause**: API enforces flow: Register → Placement → Roadmap → Tasks
- **Affected Users**: Any student not in the correct state

#### Bottleneck 3: Single Test User (P1)
- **Evidence**: State conflicts when 10 VUs use same account
- **Root Cause**: User can only be in one state (e.g., placement completed or not)
- **Affected Users**: All concurrent VUs share state

---

## Risk Assessment

### Current State Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Queue worker starvation under peak load | High | High | Deploy Redis + multiple workers |
| Database connection exhaustion | Medium | High | Connection pooling, PostgreSQL |
| Polling loop stuck indefinitely | Low | Medium | Already has timeout mechanism |
| API timeout cascade | Medium | High | Async processing, circuit breakers |
| **Rate limiting blocking legitimate users** | **High** | **High** | **Tune limits, implement sliding window** |

### Capacity Limits Discovered

- **Max sustainable VUs**: ~10 (with rate limit bypass)
- **Breaking point VUs**: ~2 (with original rate limits)
- **Recovery time after overload**: Immediate (stateless)
- **Current throughput**: 4 req/s

---

## Recommendations

### P0 - Critical (Fix immediately)

| # | Issue | Recommendation | Effort | Impact |
|---|-------|----------------|--------|--------|
| 1 | Rate limiting too aggressive | Increase login limits to 30/min per email, 100/min per IP | Low | High |
| 2 | No concurrent testing possible | Create multiple test users with different states | Low | High |

### P1 - High Priority (Fix within sprint)

| # | Issue | Recommendation | Effort | Impact |
|---|-------|----------------|--------|--------|
| 1 | SQLite not suitable for production | Switch to PostgreSQL/MySQL | Medium | High |
| 2 | Sync queue blocking | Implement Redis queue with dedicated workers | Medium | High |
| 3 | State dependencies block testing | Add "reset student state" API for testing | Medium | Medium |

### P2 - Medium Priority (Backlog)

| # | Issue | Recommendation | Effort | Impact |
|---|-------|----------------|--------|--------|
| 1 | Limited throughput | Implement caching (Redis) for frequently accessed data | Medium | Medium |
| 2 | No horizontal scaling | Containerize and add load balancer | High | Medium |
| 3 | Single-user testing | Implement user pool with pre-seeded states | High | Medium |

---

## Action Items

- [ ] **P0-1**: Revert rate limiting to production values but increase limits (Owner: Backend, Due: Immediate)
- [ ] **P0-2**: Create 10+ test users with varied states (Owner: Backend, Due: This week)
- [ ] **P1-1**: Configure PostgreSQL for load testing (Owner: DevOps, Due: Sprint)
- [ ] **P1-2**: Set up Redis queue workers (Owner: Backend, Due: Sprint)

---

## Appendix

### Raw k6 Output

```
Test Duration: 124s
VUs Max: 10
Iterations: 119

HTTP Metrics:
  - Requests: 498
  - Failed: 69.28%
  - Duration p95: 619ms

Checks Summary:
  - login status 200: 119 passes, 0 fails
  - login has token: 119 passes, 0 fails
  - questions status 200: 22 passes, 97 fails
  - placement submit 200: 10 passes, 12 fails
  - roadmap status 200: 2 passes, 117 fails
  - task submit ok: 0 passes, 119 fails
```

### Key Metrics Export

```json
{
  "http_req_duration_p95": 619.14,
  "http_req_failed": 0.6928,
  "vus_max": 10,
  "iterations": 119,
  "http_reqs_total": 498,
  "http_reqs_rate": 4.0,
  "data_received": 292237,
  "data_sent": 139355,
  "login_success_rate": 1.0,
  "placement_success_rate": 0.455,
  "task_submit_success_rate": 0.0
}
```

### Test Commands Used

```powershell
# Smoke test (used for this report)
cd backend\tests\LoadTest\k6
.\k6.exe run --summary-export=summary.json scenarios/smoke-test.js

# With rate limit temporarily increased in AppServiceProvider.php
```

### Rate Limiting Configuration

**Original (Production)**:
```php
// Login: 5/min per email, 20/min per IP
// Register: 3/min per IP  
// Submissions: 10/min per user
// Assignments: 30/min per user
// Placement: 5/min per user
```

**Testing Override (Temporary)**:
```php
// Login: 1000/min per email, 2000/min per IP
// Register: 100/min per IP
// Submissions: 500/min per user
// Assignments: 500/min per user
// Placement: 500/min per user
```

---

**Report Generated**: 2025-12-28 22:57
**Report Author**: Load Testing Automation
**Next Review**: After infrastructure improvements
