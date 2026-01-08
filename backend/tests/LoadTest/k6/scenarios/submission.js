/**
 * SCENARIO B: Task Submission Flow
 * 
 * Simulates a student submitting a task:
 * 1. Login
 * 2. Get roadmap/block info
 * 3. Get task details
 * 4. Submit task (triggers async evaluation job)
 * 5. Verify submission created
 * 
 * Expected: 200/201/202 on submit
 */

import { check, group } from 'k6';
import { CONFIG, LOAD_STAGES, THRESHOLDS } from './config.js';
import {
  metrics,
  apiRequest,
  authenticate,
  thinkTime,
  generateTaskSubmission,
  parseResponse,
  extractSubmissionId,
} from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

const testProfile = __ENV.K6_PROFILE || 'load';

export const options = {
  scenarios: {
    submission: {
      executor: 'ramping-vus',
      stages: LOAD_STAGES[testProfile] || LOAD_STAGES.load,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS.global,
    ...THRESHOLDS.submission,
  },
  tags: {
    scenario: 'submission',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🚀 Starting Task Submission Test (${testProfile} profile)`);
  console.log(`   Base URL: ${CONFIG.BASE_URL}`);
  console.log(`   Test User: ${CONFIG.TEST_USERS.student.email}`);
  
  // Validate authentication
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) {
    throw new Error('Setup failed: Cannot authenticate test user');
  }
  
  // Find a valid task to submit to
  let taskId = CONFIG.TEST_DATA.taskId;
  let blockId = CONFIG.TEST_DATA.blockId;
  
  // Try to get roadmap and find available task
  const roadmapRes = apiRequest('GET', '/student/roadmap', null, token);
  if (roadmapRes.status === 200) {
    const body = parseResponse(roadmapRes);
    if (body && body.data && body.data.blocks && body.data.blocks.length > 0) {
      // Find first unlocked block
      const block = body.data.blocks.find(b => !b.is_locked) || body.data.blocks[0];
      blockId = block.id;
      console.log(`   Using block ID: ${blockId}`);
    }
  }
  
  // Get tasks for block
  const tasksRes = apiRequest('GET', `/student/blocks/${blockId}/tasks`, null, token);
  if (tasksRes.status === 200) {
    const body = parseResponse(tasksRes);
    if (body && body.data && body.data.length > 0) {
      taskId = body.data[0].id;
      console.log(`   Using task ID: ${taskId}`);
    }
  }
  
  return { taskId, blockId };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export default function(data) {
  let token = null;
  
  // ─────────────────────────────────────────────────────
  // Step 1: Login
  // ─────────────────────────────────────────────────────
  group('1. Login', function() {
    token = authenticate(
      CONFIG.TEST_USERS.student.email,
      CONFIG.TEST_USERS.student.password
    );
    
    check(token, {
      'authentication successful': (t) => t !== null,
    });
  });
  
  if (!token) {
    console.error('VU failed to authenticate, skipping iteration');
    return;
  }
  
  thinkTime();
  
  // ─────────────────────────────────────────────────────
  // Step 2: Get Roadmap (realistic navigation)
  // ─────────────────────────────────────────────────────
  group('2. Get Roadmap', function() {
    const response = apiRequest(
      'GET',
      '/student/roadmap',
      null,
      token,
      { name: 'get_roadmap' }
    );
    
    check(response, {
      'roadmap status is 200': (r) => r.status === 200,
      'roadmap has blocks': (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.blocks;
      },
    });
  });
  
  thinkTime();
  
  // ─────────────────────────────────────────────────────
  // Step 3: Get Task Details
  // ─────────────────────────────────────────────────────
  let taskDetails = null;
  
  group('3. Get Task Details', function() {
    const response = apiRequest(
      'GET',
      `/student/tasks/${data.taskId}`,
      null,
      token,
      { name: 'get_task' }
    );
    
    check(response, {
      'task status is 200': (r) => r.status === 200,
      'task has title': (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.title;
      },
    });
    
    if (response.status === 200) {
      taskDetails = parseResponse(response)?.data;
    }
  });
  
  thinkTime();
  
  // ─────────────────────────────────────────────────────
  // Step 4: Submit Task
  // ─────────────────────────────────────────────────────
  let submissionId = null;
  
  group('4. Submit Task', function() {
    const submission = generateTaskSubmission();
    const startTime = Date.now();
    
    const response = apiRequest(
      'POST',
      `/student/tasks/${data.taskId}/submit`,
      submission,
      token,
      { name: 'submit_task' }
    );
    
    const duration = Date.now() - startTime;
    metrics.taskSubmitDuration.add(duration);
    
    const success = check(response, {
      'submit status is 200/201/202': (r) => [200, 201, 202].includes(r.status),
      'submit returns submission': (r) => {
        const body = parseResponse(r);
        return body && (body.data || body.submission || body.submission_id);
      },
    });
    
    metrics.taskSubmitSuccess.add(success ? 1 : 0);
    
    if (success) {
      submissionId = extractSubmissionId(response);
      
      // Track queue timing if available
      const body = parseResponse(response);
      if (body && body.data && body.data.evaluation_status === 'queued') {
        console.log(`Submission ${submissionId} queued for evaluation`);
      }
    } else {
      console.error(`Task submit failed: ${response.status} - ${response.body}`);
    }
  });
  
  thinkTime();
  
  // ─────────────────────────────────────────────────────
  // Step 5: Verify Submission Created
  // ─────────────────────────────────────────────────────
  if (submissionId) {
    group('5. Verify Submission', function() {
      const response = apiRequest(
        'GET',
        `/student/submissions/${submissionId}`,
        null,
        token,
        { name: 'get_submission' }
      );
      
      check(response, {
        'submission status is 200': (r) => r.status === 200,
        'submission has evaluation_status': (r) => {
          const body = parseResponse(r);
          return body && body.data && body.data.evaluation_status;
        },
      });
    });
  }
  
  thinkTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('\n✅ Task Submission Test Complete');
}
