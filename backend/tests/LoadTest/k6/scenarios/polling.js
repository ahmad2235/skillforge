/**
 * SCENARIO C: Evaluation Polling Scenario
 * 
 * Stress tests the polling behavior that has been causing issues:
 * - Detects stuck 200/204 loops
 * - Measures time to evaluation completion
 * - Tracks worker starvation patterns
 * 
 * This simulates users repeatedly checking submission status,
 * which can overwhelm the API and queue workers.
 */

import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, THRESHOLDS } from './config.js';
import {
  metrics,
  apiRequest,
  authenticate,
  thinkTime,
  generateTaskSubmission,
  parseResponse,
  extractSubmissionId,
  pollSubmissionStatus,
} from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM METRICS FOR POLLING
// ─────────────────────────────────────────────────────────────────────────────

const pollingMetrics = {
  // How many polls until completion
  pollsToCompletion: new Trend('polls_to_completion'),
  
  // Time from submit to evaluation complete
  evaluationTotalTime: new Trend('evaluation_total_time_ms'),
  
  // Rate of stuck loops detected
  stuckLoopRate: new Rate('stuck_loop_rate'),
  
  // Count of each final status
  statusCompleted: new Counter('status_completed'),
  statusTimedOut: new Counter('status_timed_out'),
  statusFailed: new Counter('status_failed'),
  statusStuck: new Counter('status_stuck'),
  
  // Concurrent pollers gauge
  activePollers: new Gauge('active_pollers'),
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

const testProfile = __ENV.K6_PROFILE || 'load';

export const options = {
  scenarios: {
    polling: {
      executor: 'ramping-vus',
      stages: LOAD_STAGES[testProfile] || LOAD_STAGES.load,
      gracefulRampDown: '60s', // Longer rampdown for polling
    },
  },
  thresholds: {
    ...THRESHOLDS.global,
    ...THRESHOLDS.evaluation,
    'stuck_loop_rate': ['rate<0.05'],           // <5% stuck loops
    'evaluation_total_time_ms': ['p95<60000'],  // 95% complete within 60s
    'polls_to_completion': ['avg<20'],          // Average <20 polls to complete
  },
  tags: {
    scenario: 'polling',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🔄 Starting Polling Stress Test (${testProfile} profile)`);
  console.log(`   Base URL: ${CONFIG.BASE_URL}`);
  console.log(`   Max Poll Attempts: ${CONFIG.TIMING.maxPollAttempts}`);
  console.log(`   Poll Interval: ${CONFIG.TIMING.pollIntervalMs}ms`);
  
  // Validate authentication
  const token = authenticate(
    CONFIG.TEST_USERS.student.email,
    CONFIG.TEST_USERS.student.password
  );
  
  if (!token) {
    throw new Error('Setup failed: Cannot authenticate test user');
  }
  
  // Find valid task
  let taskId = CONFIG.TEST_DATA.taskId;
  
  const tasksRes = apiRequest('GET', `/student/blocks/${CONFIG.TEST_DATA.blockId}/tasks`, null, token);
  if (tasksRes.status === 200) {
    const body = parseResponse(tasksRes);
    if (body && body.data && body.data.length > 0) {
      taskId = body.data[0].id;
    }
  }
  
  return { taskId };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export default function(data) {
  let token = null;
  const vuId = __VU;
  
  // Track active pollers
  pollingMetrics.activePollers.add(1);
  
  try {
    // ─────────────────────────────────────────────────────
    // Step 1: Login
    // ─────────────────────────────────────────────────────
    group('1. Login', function() {
      token = authenticate(
        CONFIG.TEST_USERS.student.email,
        CONFIG.TEST_USERS.student.password
      );
    });
    
    if (!token) {
      console.error(`VU ${vuId}: Auth failed`);
      return;
    }
    
    thinkTime('short');
    
    // ─────────────────────────────────────────────────────
    // Step 2: Submit Task (to get something to poll)
    // ─────────────────────────────────────────────────────
    let submissionId = null;
    const submitStart = Date.now();
    
    group('2. Submit Task', function() {
      const submission = generateTaskSubmission();
      
      const response = apiRequest(
        'POST',
        `/student/tasks/${data.taskId}/submit`,
        submission,
        token,
        { name: 'poll_submit_task' }
      );
      
      if ([200, 201, 202].includes(response.status)) {
        submissionId = extractSubmissionId(response);
      } else {
        console.error(`VU ${vuId}: Submit failed ${response.status}`);
      }
    });
    
    if (!submissionId) {
      console.error(`VU ${vuId}: No submission to poll`);
      return;
    }
    
    // ─────────────────────────────────────────────────────
    // Step 3: Aggressive Polling Loop
    // ─────────────────────────────────────────────────────
    group('3. Poll Until Complete', function() {
      let pollCount = 0;
      let finalStatus = null;
      let lastStatus = null;
      let sameStatusCount = 0;
      const stuckThreshold = CONFIG.TIMING.stuckThreshold || 10;
      const maxAttempts = CONFIG.TIMING.maxPollAttempts;
      const pollInterval = CONFIG.TIMING.pollIntervalMs / 1000; // Convert to seconds
      
      while (pollCount < maxAttempts) {
        pollCount++;
        
        const response = apiRequest(
          'GET',
          `/student/submissions/${submissionId}`,
          null,
          token,
          { name: 'poll_submission' }
        );
        
        metrics.pollingRequests.add(1);
        
        if (response.status !== 200) {
          console.error(`VU ${vuId}: Poll ${pollCount} got ${response.status}`);
          sleep(pollInterval);
          continue;
        }
        
        const body = parseResponse(response);
        const status = body?.data?.evaluation_status;
        
        // Track status changes
        if (status === lastStatus) {
          sameStatusCount++;
        } else {
          sameStatusCount = 1;
          lastStatus = status;
        }
        
        // Check for stuck loop
        if (sameStatusCount >= stuckThreshold && !['completed', 'failed', 'timed_out'].includes(status)) {
          console.warn(`VU ${vuId}: STUCK LOOP detected - ${status} x${sameStatusCount}`);
          pollingMetrics.stuckLoopRate.add(1);
          pollingMetrics.statusStuck.add(1);
          metrics.evaluationStuck.add(1);
          break;
        }
        
        // Check for terminal status
        if (['completed', 'failed', 'timed_out', 'manual_review', 'skipped'].includes(status)) {
          finalStatus = status;
          
          // Track by status type
          switch(status) {
            case 'completed':
              pollingMetrics.statusCompleted.add(1);
              metrics.evaluationSuccess.add(1);
              break;
            case 'timed_out':
              pollingMetrics.statusTimedOut.add(1);
              metrics.evaluationTimeout.add(1);
              break;
            case 'failed':
              pollingMetrics.statusFailed.add(1);
              break;
          }
          
          break;
        }
        
        // Brief pause before next poll
        sleep(pollInterval);
      }
      
      // Record metrics
      const totalTime = Date.now() - submitStart;
      pollingMetrics.pollsToCompletion.add(pollCount);
      
      if (finalStatus) {
        pollingMetrics.evaluationTotalTime.add(totalTime);
        metrics.evaluationDuration.add(totalTime);
        console.log(`VU ${vuId}: Completed in ${pollCount} polls (${totalTime}ms) - ${finalStatus}`);
      } else if (pollCount >= maxAttempts) {
        pollingMetrics.stuckLoopRate.add(1);
        metrics.evaluationStuck.add(1);
        console.warn(`VU ${vuId}: Max polls (${maxAttempts}) reached without completion`);
      }
      
      check(finalStatus, {
        'evaluation completed': (s) => s !== null,
        'status is success or expected': (s) => ['completed', 'manual_review', 'skipped'].includes(s),
      });
    });
    
  } finally {
    // Decrement active pollers
    pollingMetrics.activePollers.add(-1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('\n✅ Polling Stress Test Complete');
  console.log('   Review stuck_loop_rate and evaluation_total_time metrics');
}
