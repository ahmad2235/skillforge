/**
 * SkillForge Load Test Configuration
 * 
 * Central configuration for all k6 test scenarios.
 * Adjust BASE_URL and credentials for your environment.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  // Base URL - override with K6_BASE_URL env var
  BASE_URL: __ENV.K6_BASE_URL || 'http://localhost:8000/api',
  
  // Test user credentials (pre-seeded in database)
  TEST_USERS: {
    student: {
      email: __ENV.K6_STUDENT_EMAIL || 'ahmed@example.com',
      password: __ENV.K6_STUDENT_PASSWORD || 'password',
    },
    business: {
      email: __ENV.K6_BUSINESS_EMAIL || 'business@example.com',
      password: __ENV.K6_BUSINESS_PASSWORD || 'password',
    },
    admin: {
      email: __ENV.K6_ADMIN_EMAIL || 'admin@example.com',
      password: __ENV.K6_ADMIN_PASSWORD || 'password',
    },
  },
  
  // Known test data IDs (must exist in database)
  TEST_DATA: {
    blockId: parseInt(__ENV.K6_BLOCK_ID) || 1,
    taskId: parseInt(__ENV.K6_TASK_ID) || 1,
    questionIds: (__ENV.K6_QUESTION_IDS || '1,2,3').split(',').map(Number),
  },
  
  // Timing configuration
  TIMING: {
    // Realistic think time between actions (ms)
    minThinkTime: 500,
    maxThinkTime: 2000,
    
    // Polling intervals
    pollingInterval: 2000,   // 2 seconds between polls
    maxPollingAttempts: 30,  // Max 60 seconds total polling
    
    // Request timeouts
    requestTimeout: '30s',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOAD STAGES - Gradual ramp-up pattern
// ─────────────────────────────────────────────────────────────────────────────

export const LOAD_STAGES = {
  // Smoke test - quick validation
  smoke: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 0 },
  ],
  
  // Load test - normal expected load
  load: [
    { duration: '1m', target: 10 },   // Warm-up
    { duration: '2m', target: 50 },   // Ramp to 50
    { duration: '3m', target: 50 },   // Hold at 50
    { duration: '2m', target: 100 },  // Ramp to 100
    { duration: '3m', target: 100 },  // Hold at 100
    { duration: '2m', target: 0 },    // Cool-down
  ],
  
  // Stress test - find breaking point
  stress: [
    { duration: '1m', target: 10 },   // Warm-up
    { duration: '2m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '3m', target: 300 },
    { duration: '3m', target: 0 },    // Cool-down
  ],
  
  // Spike test - sudden traffic burst
  spike: [
    { duration: '30s', target: 10 },
    { duration: '10s', target: 300 }, // Sudden spike
    { duration: '2m', target: 300 },  // Hold spike
    { duration: '10s', target: 10 },  // Sudden drop
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  
  // Soak test - sustained load over time
  soak: [
    { duration: '2m', target: 100 },
    { duration: '30m', target: 100 }, // 30 min sustained
    { duration: '2m', target: 0 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS - Pass/Fail criteria (WCAG: AA level)
// ─────────────────────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  // Global thresholds
  global: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],  // p95 < 2s, p99 < 5s
    'http_req_failed': ['rate<0.01'],                   // Error rate < 1%
    'http_reqs': ['rate>10'],                           // At least 10 RPS
    'iteration_duration': ['p(95)<30000'],              // Iteration < 30s
  },
  
  // Scenario-specific thresholds
  placement: {
    'http_req_duration{scenario:placement}': ['p(95)<3000'],
    'placement_submit_success': ['rate>0.95'],
  },
  
  submission: {
    'http_req_duration{scenario:submission}': ['p(95)<2000'],
    'task_submit_success': ['rate>0.95'],
  },
  
  polling: {
    'http_req_duration{scenario:polling}': ['p(95)<500'],
    'evaluation_completed': ['rate>0.80'],  // At least 80% complete within timeout
    'polling_stuck_rate': ['rate<0.10'],    // Less than 10% stuck in loops
  },
  
  mixed: {
    'http_req_duration{scenario:mixed}': ['p(95)<2500'],
    'http_req_failed{scenario:mixed}': ['rate<0.02'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM METRICS DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTOM_METRICS = {
  // Placement metrics
  placement_submit_duration: 'trend',
  placement_submit_success: 'rate',
  
  // Task submission metrics
  task_submit_duration: 'trend',
  task_submit_success: 'rate',
  
  // Evaluation polling metrics
  polling_duration: 'trend',
  polling_attempts: 'trend',
  evaluation_completed: 'rate',
  evaluation_stuck: 'rate',
  polling_stuck_rate: 'rate',
  
  // Queue metrics (indirect)
  time_to_evaluation_start: 'trend',
  time_to_evaluation_complete: 'trend',
  
  // Error tracking
  http_4xx_errors: 'counter',
  http_5xx_errors: 'counter',
  timeout_errors: 'counter',
};

export default CONFIG;
