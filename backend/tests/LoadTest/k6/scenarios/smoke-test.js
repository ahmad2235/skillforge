/**
 * SMOKE TEST - Quick validation of all API endpoints
 * 
 * Tests basic functionality:
 * 1. Login
 * 2. Get placement questions
 * 3. Submit placement
 * 4. Get roadmap
 * 5. Submit task
 * 6. Poll submission
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8000/api';
const STUDENT_EMAIL = 'ahmed@example.com';
const STUDENT_PASSWORD = 'password';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

const loginSuccess = new Rate('login_success');
const placementSuccess = new Rate('placement_success');
const taskSubmitSuccess = new Rate('task_submit_success');
const pollingSuccess = new Rate('polling_success');
const apiErrors = new Counter('api_errors');
const requestDuration = new Trend('custom_req_duration');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },   // Ramp to 10 users
        { duration: '1m', target: 10 },    // Stay at 10
        { duration: '30s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.2'],
    'login_success': ['rate>0.8'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function jsonHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

function apiPost(path, body, token) {
  const url = BASE_URL + path;
  const res = http.post(url, JSON.stringify(body), {
    headers: jsonHeaders(token),
    timeout: '30s',
  });
  requestDuration.add(res.timings.duration);
  if (res.status >= 400) {
    apiErrors.add(1);
  }
  return res;
}

function apiGet(path, token) {
  const url = BASE_URL + path;
  const res = http.get(url, {
    headers: jsonHeaders(token),
    timeout: '30s',
  });
  requestDuration.add(res.timings.duration);
  if (res.status >= 400) {
    apiErrors.add(1);
  }
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────────────────────────────────────

export default function() {
  let token = null;
  
  // ─────────────────────────────────────────────────────
  // 1. LOGIN
  // ─────────────────────────────────────────────────────
  group('1. Login', function() {
    const res = apiPost('/auth/login', {
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    });
    
    const success = check(res, {
      'login status 200': (r) => r.status === 200,
      'login has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token || (body.user && body.user.id);
        } catch(e) {
          return false;
        }
      },
    });
    
    loginSuccess.add(success ? 1 : 0);
    
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        token = body.token;
        console.log('VU ' + __VU + ': Login success, got token');
      } catch(e) {
        console.error('VU ' + __VU + ': Failed to parse login response: ' + e);
      }
    } else {
      console.error('VU ' + __VU + ': Login failed with status ' + res.status + ': ' + res.body);
    }
  });
  
  if (!token) {
    console.error('No token, skipping authenticated tests');
    return;
  }
  
  sleep(1);
  
  // ─────────────────────────────────────────────────────
  // 2. GET PLACEMENT QUESTIONS
  // ─────────────────────────────────────────────────────
  let questions = [];
  
  group('2. Get Placement Questions', function() {
    const res = apiGet('/student/assessment/placement/questions', token);
    
    check(res, {
      'questions status 200': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        questions = body.data || body.questions || [];
      } catch(e) {
        // ignore
      }
    }
  });
  
  sleep(1);
  
  // ─────────────────────────────────────────────────────
  // 3. SUBMIT PLACEMENT (if questions available)
  // ─────────────────────────────────────────────────────
  if (questions.length > 0) {
    group('3. Submit Placement', function() {
      // Generate answers for each question
      const answers = questions.slice(0, 5).map(function(q, idx) {
        return {
          question_id: q.id || (idx + 1),
          answer_text: 'Test answer for load testing - ' + Math.random(),
        };
      });
      
      const res = apiPost('/student/assessment/placement/submit', { answers: answers }, token);
      
      const success = check(res, {
        'placement submit 200': (r) => r.status === 200 || r.status === 201,
      });
      
      placementSuccess.add(success ? 1 : 0);
    });
  }
  
  sleep(1);
  
  // ─────────────────────────────────────────────────────
  // 4. GET ROADMAP
  // ─────────────────────────────────────────────────────
  let taskId = 1;
  
  group('4. Get Roadmap', function() {
    const res = apiGet('/student/roadmap', token);
    
    check(res, {
      'roadmap status 200': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        if (body.data && body.data.blocks && body.data.blocks.length > 0) {
          const block = body.data.blocks[0];
          if (block.tasks && block.tasks.length > 0) {
            taskId = block.tasks[0].id;
          }
        }
      } catch(e) {
        // use default taskId
      }
    }
  });
  
  sleep(1);
  
  // ─────────────────────────────────────────────────────
  // 5. SUBMIT TASK
  // ─────────────────────────────────────────────────────
  let submissionId = null;
  
  group('5. Submit Task', function() {
    const res = apiPost('/student/tasks/' + taskId + '/submit', {
      content: 'Load test submission content - ' + Date.now(),
      code: 'console.log("hello world");',
    }, token);
    
    const success = check(res, {
      'task submit ok': (r) => r.status === 200 || r.status === 201 || r.status === 202,
    });
    
    taskSubmitSuccess.add(success ? 1 : 0);
    
    if (res.status === 200 || res.status === 201 || res.status === 202) {
      try {
        const body = JSON.parse(res.body);
        submissionId = body.submission_id || (body.data && body.data.id) || (body.submission && body.submission.id);
      } catch(e) {
        // ignore
      }
    }
  });
  
  sleep(1);
  
  // ─────────────────────────────────────────────────────
  // 6. POLL SUBMISSION STATUS
  // ─────────────────────────────────────────────────────
  if (submissionId) {
    group('6. Poll Submission', function() {
      let pollCount = 0;
      const maxPolls = 10;
      let finalStatus = null;
      
      while (pollCount < maxPolls && !finalStatus) {
        pollCount++;
        
        const res = apiGet('/student/submissions/' + submissionId, token);
        
        if (res.status === 200) {
          try {
            const body = JSON.parse(res.body);
            const status = body.data && body.data.evaluation_status;
            
            if (status === 'completed' || status === 'failed' || status === 'timed_out') {
              finalStatus = status;
            }
          } catch(e) {
            // continue polling
          }
        }
        
        if (!finalStatus) {
          sleep(2);
        }
      }
      
      const success = check(finalStatus, {
        'evaluation completed': (s) => s !== null,
      });
      
      pollingSuccess.add(success ? 1 : 0);
      
      console.log('VU ' + __VU + ': Polled ' + pollCount + ' times, final status: ' + finalStatus);
    });
  }
  
  sleep(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  console.log('\n========== SMOKE TEST SUMMARY ==========\n');
  
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // Simple text output
  let summary = 'Test Duration: ' + Math.round(data.state.testRunDurationMs / 1000) + 's\n';
  summary += 'VUs Max: ' + data.metrics.vus_max.values.max + '\n';
  summary += 'Iterations: ' + data.metrics.iterations.values.count + '\n';
  summary += '\nHTTP Metrics:\n';
  summary += '  - Requests: ' + data.metrics.http_reqs.values.count + '\n';
  summary += '  - Failed: ' + (data.metrics.http_req_failed.values.rate * 100).toFixed(2) + '%\n';
  summary += '  - Duration p95: ' + Math.round(data.metrics.http_req_duration.values['p(95)']) + 'ms\n';
  
  return summary;
}
