/**
 * SCENARIO D: Mixed Load Test
 * 
 * Realistic concurrent load combining all user behaviors:
 * - Students taking placement tests
 * - Students submitting tasks
 * - Students polling for evaluation results
 * - General API browsing (roadmaps, profiles)
 * 
 * This simulates real-world traffic patterns where different
 * types of requests happen simultaneously.
 */

import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { CONFIG, LOAD_STAGES, THRESHOLDS } from './config.js';
import {
  metrics,
  apiRequest,
  authenticate,
  thinkTime,
  generatePlacementAnswers,
  generateTaskSubmission,
  parseResponse,
  extractSubmissionId,
} from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS - Multiple Scenarios Running Concurrently
// ─────────────────────────────────────────────────────────────────────────────

const testProfile = __ENV.K6_PROFILE || 'load';
const stages = LOAD_STAGES[testProfile] || LOAD_STAGES.load;

export const options = {
  scenarios: {
    // 30% of traffic: Placement tests
    placement_flow: {
      executor: 'ramping-vus',
      stages: stages.map(s => ({ ...s, target: Math.ceil(s.target * 0.3) })),
      exec: 'placementFlow',
      tags: { flow: 'placement' },
    },
    
    // 40% of traffic: Task submissions
    submission_flow: {
      executor: 'ramping-vus',
      stages: stages.map(s => ({ ...s, target: Math.ceil(s.target * 0.4) })),
      exec: 'submissionFlow',
      startTime: '10s', // Staggered start
      tags: { flow: 'submission' },
    },
    
    // 20% of traffic: Polling (checking evaluation status)
    polling_flow: {
      executor: 'ramping-vus',
      stages: stages.map(s => ({ ...s, target: Math.ceil(s.target * 0.2) })),
      exec: 'pollingFlow',
      startTime: '20s',
      tags: { flow: 'polling' },
    },
    
    // 10% of traffic: General browsing
    browsing_flow: {
      executor: 'ramping-vus',
      stages: stages.map(s => ({ ...s, target: Math.ceil(s.target * 0.1) })),
      exec: 'browsingFlow',
      tags: { flow: 'browsing' },
    },
  },
  thresholds: {
    ...THRESHOLDS.global,
    // Per-flow thresholds
    'http_req_duration{flow:placement}': ['p95<3000'],
    'http_req_duration{flow:submission}': ['p95<2000'],
    'http_req_duration{flow:polling}': ['p95<500'],
    'http_req_duration{flow:browsing}': ['p95<1000'],
  },
  tags: {
    scenario: 'mixed',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🌐 Starting Mixed Load Test (${testProfile} profile)`);
  console.log(`   Base URL: ${CONFIG.BASE_URL}`);
  console.log(`   Traffic Split: 30% placement, 40% submission, 20% polling, 10% browsing`);
  
  // Validate auth works
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) {
    throw new Error('Setup failed: Cannot authenticate');
  }
  
  // Gather test data
  const testData = {
    taskId: CONFIG.TEST_DATA.taskId,
    blockId: CONFIG.TEST_DATA.blockId,
    roadmapId: CONFIG.TEST_DATA.roadmapId,
  };
  
  // Try to find real task
  const tasksRes = apiRequest('GET', `/student/blocks/${testData.blockId}/tasks`, null, token);
  if (tasksRes.status === 200) {
    const body = parseResponse(tasksRes);
    if (body?.data?.length > 0) {
      testData.taskId = body.data[0].id;
    }
  }
  
  return testData;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW A: PLACEMENT TEST
// ─────────────────────────────────────────────────────────────────────────────

export function placementFlow(data) {
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) return;
  
  group('Placement: Get Questions', function() {
    const response = apiRequest(
      'GET',
      '/student/assessment/placement/questions',
      null,
      token,
      { name: 'placement_questions', tags: { flow: 'placement' } }
    );
    
    check(response, {
      'placement questions 200': (r) => r.status === 200,
    });
  });
  
  thinkTime('long'); // User reads questions
  
  group('Placement: Submit', function() {
    const answers = generatePlacementAnswers(5);
    
    const response = apiRequest(
      'POST',
      '/student/assessment/placement/submit',
      { answers },
      token,
      { name: 'placement_submit', tags: { flow: 'placement' } }
    );
    
    const success = check(response, {
      'placement submit 200': (r) => r.status === 200,
    });
    
    metrics.placementSuccess.add(success ? 1 : 0);
  });
  
  thinkTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW B: TASK SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────

export function submissionFlow(data) {
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) return;
  
  // Get task info
  group('Submission: Get Task', function() {
    const response = apiRequest(
      'GET',
      `/student/tasks/${data.taskId}`,
      null,
      token,
      { name: 'get_task_for_submit', tags: { flow: 'submission' } }
    );
    
    check(response, {
      'task fetch 200': (r) => r.status === 200,
    });
  });
  
  thinkTime('long'); // User works on task
  
  // Submit task
  group('Submission: Submit Task', function() {
    const submission = generateTaskSubmission();
    const startTime = Date.now();
    
    const response = apiRequest(
      'POST',
      `/student/tasks/${data.taskId}/submit`,
      submission,
      token,
      { name: 'submit_task_mixed', tags: { flow: 'submission' } }
    );
    
    metrics.taskSubmitDuration.add(Date.now() - startTime);
    
    const success = check(response, {
      'task submit ok': (r) => [200, 201, 202].includes(r.status),
    });
    
    metrics.taskSubmitSuccess.add(success ? 1 : 0);
  });
  
  thinkTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW C: POLLING
// ─────────────────────────────────────────────────────────────────────────────

export function pollingFlow(data) {
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) return;
  
  // First submit something to poll
  let submissionId = null;
  
  group('Polling: Submit', function() {
    const submission = generateTaskSubmission();
    
    const response = apiRequest(
      'POST',
      `/student/tasks/${data.taskId}/submit`,
      submission,
      token,
      { name: 'polling_submit', tags: { flow: 'polling' } }
    );
    
    if ([200, 201, 202].includes(response.status)) {
      submissionId = extractSubmissionId(response);
    }
  });
  
  if (!submissionId) return;
  
  // Poll multiple times (simulating user refreshing)
  group('Polling: Check Status', function() {
    const pollCount = Math.floor(Math.random() * 5) + 3; // 3-7 polls
    
    for (let i = 0; i < pollCount; i++) {
      const response = apiRequest(
        'GET',
        `/student/submissions/${submissionId}`,
        null,
        token,
        { name: 'poll_status_mixed', tags: { flow: 'polling' } }
      );
      
      metrics.pollingRequests.add(1);
      
      check(response, {
        'poll status 200': (r) => r.status === 200,
      });
      
      // Check if done
      const body = parseResponse(response);
      if (['completed', 'failed', 'timed_out'].includes(body?.data?.evaluation_status)) {
        break;
      }
      
      sleep(CONFIG.TIMING.pollIntervalMs / 1000);
    }
  });
  
  thinkTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW D: BROWSING
// ─────────────────────────────────────────────────────────────────────────────

export function browsingFlow(data) {
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) return;
  
  const endpoints = [
    '/student/roadmap',
    '/student/profile',
    '/student/portfolio',
    '/student/badges',
    `/student/blocks/${data.blockId}/tasks`,
  ];
  
  group('Browsing: Random Pages', function() {
    // Visit 2-4 random pages
    const pageCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < pageCount; i++) {
      const endpoint = randomItem(endpoints);
      
      const response = apiRequest(
        'GET',
        endpoint,
        null,
        token,
        { name: 'browse_page', tags: { flow: 'browsing' } }
      );
      
      check(response, {
        'browse status ok': (r) => [200, 204].includes(r.status),
      });
      
      thinkTime('short');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('\n✅ Mixed Load Test Complete');
  console.log('   Review per-flow metrics for bottleneck analysis');
}
