/**
 * SCENARIO A: Placement Submission Flow
 * 
 * Simulates a student taking the placement test:
 * 1. Login
 * 2. Get placement questions
 * 3. Submit answers
 * 4. Check result
 * 
 * Expected: 200 or 201 on submit
 */

import { check, group } from 'k6';
import { CONFIG, LOAD_STAGES, THRESHOLDS } from './config.js';
import {
  metrics,
  apiRequest,
  authenticate,
  thinkTime,
  generatePlacementAnswers,
  parseResponse,
} from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

const testProfile = __ENV.K6_PROFILE || 'load';

export const options = {
  scenarios: {
    placement: {
      executor: 'ramping-vus',
      stages: LOAD_STAGES[testProfile] || LOAD_STAGES.load,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS.global,
    ...THRESHOLDS.placement,
  },
  tags: {
    scenario: 'placement',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP - Run once before test
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🚀 Starting Placement Flow Test (${testProfile} profile)`);
  console.log(`   Base URL: ${CONFIG.BASE_URL}`);
  console.log(`   Test User: ${CONFIG.TEST_USERS.student.email}`);
  
  // Validate we can authenticate
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) {
    throw new Error('Setup failed: Cannot authenticate test user');
  }
  
  // Get question IDs for test
  const questionsRes = apiRequest('GET', '/student/assessment/placement/questions', null, token);
  let questionIds = CONFIG.TEST_DATA.questionIds;
  
  if (questionsRes.status === 200) {
    const body = parseResponse(questionsRes);
    if (body && body.data && body.data.length > 0) {
      questionIds = body.data.slice(0, 5).map(q => q.id);
      console.log(`   Using ${questionIds.length} questions from API`);
    }
  }
  
  return { questionIds };
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
  // Step 2: Get Placement Questions
  // ─────────────────────────────────────────────────────
  let questions = [];
  
  group('2. Get Questions', function() {
    const response = apiRequest(
      'GET',
      '/student/assessment/placement/questions?domain=frontend',
      null,
      token,
      { name: 'get_questions' }
    );
    
    check(response, {
      'get questions status is 200': (r) => r.status === 200,
      'questions array returned': (r) => {
        const body = parseResponse(r);
        return body && body.data && Array.isArray(body.data);
      },
    });
    
    if (response.status === 200) {
      const body = parseResponse(response);
      questions = body?.data || [];
    }
  });
  
  thinkTime();
  
  // ─────────────────────────────────────────────────────
  // Step 3: Submit Placement Answers
  // ─────────────────────────────────────────────────────
  let placementResultId = null;
  
  group('3. Submit Placement', function() {
    // Use questions from API or fallback to config
    const questionIds = questions.length > 0 
      ? questions.slice(0, 5).map(q => q.id)
      : data.questionIds;
    
    const answers = generatePlacementAnswers(questionIds);
    const startTime = Date.now();
    
    const response = apiRequest(
      'POST',
      '/student/assessment/placement/submit',
      { answers, domain: 'frontend' },
      token,
      { name: 'submit_placement' }
    );
    
    const duration = Date.now() - startTime;
    metrics.placementSubmitDuration.add(duration);
    
    const success = check(response, {
      'submit status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'submit returns result': (r) => {
        const body = parseResponse(r);
        return body && body.data;
      },
    });
    
    metrics.placementSubmitSuccess.add(success ? 1 : 0);
    
    if (success) {
      const body = parseResponse(response);
      placementResultId = body?.data?.id || body?.data?.placement_result_id;
    } else {
      console.error(`Placement submit failed: ${response.status} - ${response.body}`);
    }
  });
  
  thinkTime();
  
  // ─────────────────────────────────────────────────────
  // Step 4: Verify Result
  // ─────────────────────────────────────────────────────
  group('4. Verify Result', function() {
    const response = apiRequest(
      'GET',
      '/student/assessment/placement/latest',
      null,
      token,
      { name: 'get_result' }
    );
    
    check(response, {
      'get result status is 200': (r) => r.status === 200,
      'result has level': (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.level;
      },
      'result has score': (r) => {
        const body = parseResponse(r);
        return body && body.data && typeof body.data.score !== 'undefined';
      },
    });
  });
  
  thinkTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('\n✅ Placement Flow Test Complete');
}
