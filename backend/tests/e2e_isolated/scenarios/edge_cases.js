/**
 * E2E Edge Cases Test Scenario
 * Created: 2025-12-29
 * Purpose: Test edge cases - invalid submissions, incomplete placements, concurrent submissions
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, getUserForVU, jsonHeaders } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

var loginSuccess = new Rate('login_success');
var invalidLoginHandled = new Rate('invalid_login_handled');
var invalidSubmissionHandled = new Rate('invalid_submission_handled');
var incompletePlacementHandled = new Rate('incomplete_placement_handled');
var concurrentSubmissionHandled = new Rate('concurrent_submission_handled');
var unauthorizedHandled = new Rate('unauthorized_handled');
var edgeCasesPassed = new Rate('edge_cases_passed');
var apiErrors = new Counter('api_errors');
var requestDuration = new Trend('request_duration');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

var profile = __ENV.E2E_PROFILE || 'e2e';

export var options = {
    scenarios: {
        edge_cases: {
            executor: 'ramping-vus',
            stages: LOAD_STAGES[profile] || LOAD_STAGES.e2e,
            gracefulRampDown: '10s'
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'invalid_login_handled': ['rate>0.95'],
        'invalid_submission_handled': ['rate>0.90'],
        'unauthorized_handled': ['rate>0.95']
    },
    tags: {
        scenario: 'e2e_edge_cases',
        environment: 'e2e_isolated'
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function apiPost(path, body, token) {
    var url = CONFIG.BASE_URL + path;
    var res = http.post(url, JSON.stringify(body), {
        headers: jsonHeaders(token),
        timeout: CONFIG.TIMEOUTS.request
    });
    requestDuration.add(res.timings.duration);
    return res;
}

function apiGet(path, token) {
    var url = CONFIG.BASE_URL + path;
    var res = http.get(url, {
        headers: jsonHeaders(token),
        timeout: CONFIG.TIMEOUTS.request
    });
    requestDuration.add(res.timings.duration);
    return res;
}

function doLogin(user) {
    var res = apiPost('/auth/login', {
        email: user.email,
        password: user.password
    }, null);
    
    var success = res.status === 200;
    loginSuccess.add(success ? 1 : 0);
    
    if (success) {
        try {
            var body = JSON.parse(res.body);
            return body.token;
        } catch(e) {
            return null;
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────────────────────────────────────

export default function() {
    var user = getUserForVU(__VU, 'students');
    var token = null;
    var allPassed = true;
    
    // Rotate through different edge case tests based on iteration
    var testCase = __ITER % 5;
    
    // ─────────────────────────────────────────────────────
    // EDGE CASE 1: Invalid Login Credentials
    // ─────────────────────────────────────────────────────
    if (testCase === 0) {
        group('Edge Case: Invalid Login', function() {
            var res = apiPost('/auth/login', {
                email: 'invalid_user_' + __VU + '@nonexistent.com',
                password: 'wrong_password_123'
            }, null);
            
            // Should return 401 or 422
            var handled = check(res, {
                'invalid login returns error': function(r) { 
                    return r.status === 401 || r.status === 422 || r.status === 429;
                }
            });
            
            invalidLoginHandled.add(handled ? 1 : 0);
            
            if (handled) {
                console.log('VU ' + __VU + ': Invalid login correctly rejected with ' + res.status);
            } else {
                allPassed = false;
            }
        });
    }
    
    // ─────────────────────────────────────────────────────
    // EDGE CASE 2: Unauthorized Access
    // ─────────────────────────────────────────────────────
    else if (testCase === 1) {
        group('Edge Case: Unauthorized Access', function() {
            // Try to access protected endpoint without token
            var res = apiGet('/student/roadmap', null);
            
            var handled = check(res, {
                'unauthorized returns 401': function(r) { 
                    return r.status === 401; 
                }
            });
            
            unauthorizedHandled.add(handled ? 1 : 0);
            
            if (handled) {
                console.log('VU ' + __VU + ': Unauthorized access correctly rejected');
            } else {
                allPassed = false;
            }
            
            sleep(0.5);
            
            // Try to access admin endpoint with student token
            token = doLogin(user);
            if (token) {
                var adminRes = apiGet('/admin/users', token);
                
                var adminHandled = check(adminRes, {
                    'student cant access admin': function(r) { 
                        return r.status === 401 || r.status === 403; 
                    }
                });
                
                if (adminHandled) {
                    console.log('VU ' + __VU + ': Student correctly blocked from admin');
                } else {
                    allPassed = false;
                }
            }
        });
    }
    
    // ─────────────────────────────────────────────────────
    // EDGE CASE 3: Invalid Submission Data
    // ─────────────────────────────────────────────────────
    else if (testCase === 2) {
        group('Edge Case: Invalid Submission', function() {
            token = doLogin(user);
            
            if (token) {
                // Submit task with missing required fields
                var res = apiPost('/student/tasks/999999/submit', {
                    // Missing content field
                }, token);
                
                var handled = check(res, {
                    'invalid submission returns error': function(r) { 
                        return r.status === 400 || r.status === 422 || r.status === 404; 
                    }
                });
                
                invalidSubmissionHandled.add(handled ? 1 : 0);
                
                if (handled) {
                    console.log('VU ' + __VU + ': Invalid submission correctly rejected with ' + res.status);
                } else {
                    allPassed = false;
                }
                
                sleep(0.5);
                
                // Submit to non-existent task
                var res2 = apiPost('/student/tasks/-1/submit', {
                    content: 'Test content'
                }, token);
                
                var handled2 = check(res2, {
                    'nonexistent task returns 404': function(r) { 
                        return r.status === 404 || r.status === 422; 
                    }
                });
                
                if (handled2) {
                    console.log('VU ' + __VU + ': Nonexistent task correctly returns error');
                } else {
                    allPassed = false;
                }
            } else {
                invalidSubmissionHandled.add(0);
                allPassed = false;
            }
        });
    }
    
    // ─────────────────────────────────────────────────────
    // EDGE CASE 4: Incomplete Placement
    // ─────────────────────────────────────────────────────
    else if (testCase === 3) {
        group('Edge Case: Incomplete Placement', function() {
            token = doLogin(user);
            
            if (token) {
                // Submit placement with incomplete answers
                var res = apiPost('/student/assessment/placement/submit', {
                    answers: [
                        // Only 1 answer when more are expected
                        { question_id: 1, answer_text: '' }
                    ]
                }, token);
                
                // Should either reject (422) or handle gracefully
                var handled = check(res, {
                    'incomplete placement handled': function(r) { 
                        return r.status === 200 || r.status === 201 || 
                               r.status === 400 || r.status === 422; 
                    }
                });
                
                incompletePlacementHandled.add(handled ? 1 : 0);
                
                if (handled) {
                    console.log('VU ' + __VU + ': Incomplete placement handled with ' + res.status);
                } else {
                    allPassed = false;
                }
            } else {
                incompletePlacementHandled.add(0);
                allPassed = false;
            }
        });
    }
    
    // ─────────────────────────────────────────────────────
    // EDGE CASE 5: Rapid Concurrent Submissions
    // ─────────────────────────────────────────────────────
    else if (testCase === 4) {
        group('Edge Case: Concurrent Submissions', function() {
            token = doLogin(user);
            
            if (token) {
                // Get roadmap to find a task
                var roadmapRes = apiGet('/student/roadmap', token);
                var taskId = null;
                
                if (roadmapRes.status === 200) {
                    try {
                        var body = JSON.parse(roadmapRes.body);
                        var roadmap = body.data || body;
                        if (roadmap && roadmap.blocks && roadmap.blocks.length > 0) {
                            for (var i = 0; i < roadmap.blocks.length; i++) {
                                var block = roadmap.blocks[i];
                                if (block.tasks && block.tasks.length > 0) {
                                    taskId = block.tasks[0].id;
                                    break;
                                }
                            }
                        }
                    } catch(e) {}
                }
                
                if (taskId) {
                    // Rapid fire submissions
                    var successCount = 0;
                    var handled = true;
                    
                    for (var i = 0; i < 3; i++) {
                        var res = apiPost('/student/tasks/' + taskId + '/submit', {
                            content: 'Concurrent test ' + i + ' - VU' + __VU,
                            code: 'console.log(' + i + ');'
                        }, token);
                        
                        // Should accept first, may throttle subsequent
                        if (res.status === 200 || res.status === 201 || res.status === 202 ||
                            res.status === 422 || res.status === 429) {
                            successCount++;
                        } else {
                            handled = false;
                        }
                    }
                    
                    concurrentSubmissionHandled.add(handled ? 1 : 0);
                    
                    if (handled) {
                        console.log('VU ' + __VU + ': Concurrent submissions handled (' + successCount + '/3)');
                    } else {
                        allPassed = false;
                    }
                } else {
                    concurrentSubmissionHandled.add(0);
                    console.log('VU ' + __VU + ': No task found for concurrent test');
                }
            } else {
                concurrentSubmissionHandled.add(0);
                allPassed = false;
            }
        });
    }
    
    // Record overall edge case pass rate
    edgeCasesPassed.add(allPassed ? 1 : 0);
    
    sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
    var summary = {
        scenario: 'E2E Edge Cases',
        timestamp: new Date().toISOString(),
        metrics: {
            total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            invalid_login_handled_rate: data.metrics.invalid_login_handled ? data.metrics.invalid_login_handled.values.rate : 0,
            unauthorized_handled_rate: data.metrics.unauthorized_handled ? data.metrics.unauthorized_handled.values.rate : 0,
            invalid_submission_handled_rate: data.metrics.invalid_submission_handled ? data.metrics.invalid_submission_handled.values.rate : 0,
            incomplete_placement_handled_rate: data.metrics.incomplete_placement_handled ? data.metrics.incomplete_placement_handled.values.rate : 0,
            concurrent_submission_handled_rate: data.metrics.concurrent_submission_handled ? data.metrics.concurrent_submission_handled.values.rate : 0,
            overall_pass_rate: data.metrics.edge_cases_passed ? data.metrics.edge_cases_passed.values.rate : 0,
            p95_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0
        }
    };
    
    console.log('\n========== E2E EDGE CASES SUMMARY ==========');
    console.log('Total Requests: ' + summary.metrics.total_requests);
    console.log('Overall Pass Rate: ' + (summary.metrics.overall_pass_rate * 100).toFixed(2) + '%');
    console.log('Invalid Login Handled: ' + (summary.metrics.invalid_login_handled_rate * 100).toFixed(2) + '%');
    console.log('Unauthorized Handled: ' + (summary.metrics.unauthorized_handled_rate * 100).toFixed(2) + '%');
    console.log('p95 Duration: ' + (summary.metrics.p95_duration || 0).toFixed(2) + 'ms');
    console.log('=============================================\n');
    
    return {
        'reports/edge_cases_summary.json': JSON.stringify(summary, null, 2)
    };
}
