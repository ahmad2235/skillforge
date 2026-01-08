/**
 * SkillForge Load Test Utilities
 * 
 * Helper functions for authentication, requests, and metrics.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const metrics = {
  // Placement
  placementSubmitDuration: new Trend('placement_submit_duration'),
  placementSubmitSuccess: new Rate('placement_submit_success'),
  
  // Task submission
  taskSubmitDuration: new Trend('task_submit_duration'),
  taskSubmitSuccess: new Rate('task_submit_success'),
  
  // Polling
  pollingDuration: new Trend('polling_duration'),
  pollingAttempts: new Trend('polling_attempts'),
  evaluationCompleted: new Rate('evaluation_completed'),
  evaluationStuck: new Rate('evaluation_stuck'),
  pollingStuckRate: new Rate('polling_stuck_rate'),
  
  // Timing
  timeToEvaluationStart: new Trend('time_to_evaluation_start'),
  timeToEvaluationComplete: new Trend('time_to_evaluation_complete'),
  
  // Errors
  http4xxErrors: new Counter('http_4xx_errors'),
  http5xxErrors: new Counter('http_5xx_errors'),
  timeoutErrors: new Counter('timeout_errors'),
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get default headers for API requests
 */
export function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Make authenticated request with error tracking
 */
export function apiRequest(method, endpoint, body = null, token = null, tags = {}) {
  const url = `${CONFIG.BASE_URL}${endpoint}`;
  const params = {
    headers: getHeaders(token),
    tags: tags,
    timeout: CONFIG.TIMING.requestTimeout,
  };
  
  let response;
  
  try {
    if (method === 'GET') {
      response = http.get(url, params);
    } else if (method === 'POST') {
      response = http.post(url, body ? JSON.stringify(body) : null, params);
    } else if (method === 'PUT') {
      response = http.put(url, body ? JSON.stringify(body) : null, params);
    } else if (method === 'DELETE') {
      response = http.del(url, null, params);
    }
  } catch (e) {
    metrics.timeoutErrors.add(1);
    return { status: 0, body: '', error: e.message };
  }
  
  // Track error rates by status code
  if (response.status >= 400 && response.status < 500) {
    metrics.http4xxErrors.add(1);
  } else if (response.status >= 500) {
    metrics.http5xxErrors.add(1);
  }
  
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticate and get bearer token
 */
export function authenticate(email, password) {
  const response = apiRequest('POST', '/auth/login', { email, password });
  
  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.token;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    console.error(`Authentication failed: ${response.status} - ${response.body}`);
    return null;
  }
  
  try {
    const body = JSON.parse(response.body);
    return body.data.token;
  } catch {
    return null;
  }
}

/**
 * Get student token (with caching for VU)
 */
let cachedStudentToken = null;
export function getStudentToken() {
  if (!cachedStudentToken) {
    cachedStudentToken = authenticate(
      CONFIG.TEST_USERS.student.email,
      CONFIG.TEST_USERS.student.password
    );
  }
  return cachedStudentToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// THINK TIME / PACING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Realistic think time between actions
 */
export function thinkTime() {
  const min = CONFIG.TIMING.minThinkTime / 1000;
  const max = CONFIG.TIMING.maxThinkTime / 1000;
  sleep(Math.random() * (max - min) + min);
}

/**
 * Short pause (for polling)
 */
export function pollingPause() {
  sleep(CONFIG.TIMING.pollingInterval / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate random placement answers
 */
export function generatePlacementAnswers(questionIds) {
  return questionIds.map(qId => ({
    question_id: qId,
    answer: `Load test answer for question ${qId}: ${randomString(50)}`,
  }));
}

/**
 * Generate task submission payload
 */
export function generateTaskSubmission() {
  return {
    answer_text: `Load test submission: ${randomString(100)}\n\nCode:\n\`\`\`javascript\nconsole.log("Hello World");\n\`\`\``,
    attachment_url: `https://github.com/loadtest/repo-${randomInt(1000, 9999)}`,
  };
}

/**
 * Random string generator
 */
export function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Random integer generator
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE PARSERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely parse JSON response
 */
export function parseResponse(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

/**
 * Extract submission ID from response
 */
export function extractSubmissionId(response) {
  const body = parseResponse(response);
  if (body && body.data) {
    return body.data.submission_id || body.data.id || null;
  }
  return null;
}

/**
 * Extract evaluation status from polling response
 */
export function extractEvaluationStatus(response) {
  const body = parseResponse(response);
  if (!body || !body.data) return { status: 'unknown', isTerminal: false };
  
  const data = body.data;
  
  // Check various status fields
  const evaluationStatus = data.evaluation_status || data.semantic_status || data.status;
  
  // Terminal states
  const terminalStates = ['completed', 'failed', 'timed_out', 'manual_review', 'skipped'];
  const isTerminal = terminalStates.includes(evaluationStatus);
  
  // Stuck detection: evaluating for too long is suspicious
  const isEvaluating = evaluationStatus === 'evaluating' || evaluationStatus === 'queued';
  
  return {
    status: evaluationStatus,
    isTerminal,
    isEvaluating,
    score: data.ai_score || data.final_score || data.score || null,
    feedback: data.ai_feedback || data.feedback || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POLLING HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll submission status until terminal state or timeout
 * Returns: { success, attempts, finalStatus, stuck, totalTime }
 */
export function pollSubmissionStatus(submissionId, token, maxAttempts = null) {
  maxAttempts = maxAttempts || CONFIG.TIMING.maxPollingAttempts;
  
  const startTime = Date.now();
  let attempts = 0;
  let lastStatus = 'unknown';
  let consecutiveSameStatus = 0;
  let previousStatus = null;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const response = apiRequest(
      'GET',
      `/student/submissions/${submissionId}`,
      null,
      token,
      { name: 'polling' }
    );
    
    // Track each poll
    metrics.pollingDuration.add(response.timings.duration);
    
    if (response.status !== 200 && response.status !== 204) {
      console.error(`Polling error: ${response.status}`);
      pollingPause();
      continue;
    }
    
    const evalStatus = extractEvaluationStatus(response);
    lastStatus = evalStatus.status;
    
    // Detect stuck loops (same non-terminal status repeatedly)
    if (evalStatus.status === previousStatus && evalStatus.isEvaluating) {
      consecutiveSameStatus++;
    } else {
      consecutiveSameStatus = 0;
    }
    previousStatus = evalStatus.status;
    
    // Stuck detection: 10+ consecutive same evaluating status
    if (consecutiveSameStatus >= 10) {
      metrics.pollingStuckRate.add(1);
      metrics.evaluationStuck.add(1);
      return {
        success: false,
        attempts,
        finalStatus: lastStatus,
        stuck: true,
        totalTime: Date.now() - startTime,
      };
    }
    
    // Terminal state reached
    if (evalStatus.isTerminal) {
      metrics.evaluationCompleted.add(1);
      return {
        success: evalStatus.status === 'completed',
        attempts,
        finalStatus: lastStatus,
        stuck: false,
        totalTime: Date.now() - startTime,
        score: evalStatus.score,
      };
    }
    
    pollingPause();
  }
  
  // Timeout - evaluation didn't complete in time
  metrics.pollingStuckRate.add(1);
  metrics.evaluationStuck.add(1);
  
  return {
    success: false,
    attempts,
    finalStatus: lastStatus,
    stuck: true,
    totalTime: Date.now() - startTime,
  };
}

export default {
  metrics,
  getHeaders,
  apiRequest,
  authenticate,
  getStudentToken,
  thinkTime,
  pollingPause,
  generatePlacementAnswers,
  generateTaskSubmission,
  randomString,
  randomInt,
  parseResponse,
  extractSubmissionId,
  extractEvaluationStatus,
  pollSubmissionStatus,
};
