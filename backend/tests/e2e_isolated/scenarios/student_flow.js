/**
 * E2E Student Flow Test Scenario
 * Created: 2025-12-29
 * Purpose: Test complete student journey - placement → roadmap → task → evaluation
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, getUserForVU, jsonHeaders } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

var loginSuccess = new Rate('login_success');
var placementFetchSuccess = new Rate('placement_fetch_success');
var placementSubmitSuccess = new Rate('placement_submit_success');
var roadmapFetchSuccess = new Rate('roadmap_fetch_success');
var taskSubmitSuccess = new Rate('task_submit_success');
var evaluationCheckSuccess = new Rate('evaluation_check_success');
var studentFlowComplete = new Rate('student_flow_complete');
var apiErrors = new Counter('api_errors');
var requestDuration = new Trend('request_duration');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

var profile = __ENV.E2E_PROFILE || 'e2e';

export var options = {
    scenarios: {
        student_flow: {
            executor: 'ramping-vus',
            stages: LOAD_STAGES[profile] || LOAD_STAGES.e2e,
            gracefulRampDown: '10s'
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.20'],
        'login_success': ['rate>0.90'],
        'placement_fetch_success': ['rate>0.70'],
        'roadmap_fetch_success': ['rate>0.70'],
        'task_submit_success': ['rate>0.60']
    },
    tags: {
        scenario: 'e2e_student_flow',
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
    if (res.status >= 400) {
        apiErrors.add(1);
    }
    return res;
}

function apiGet(path, token) {
    var url = CONFIG.BASE_URL + path;
    var res = http.get(url, {
        headers: jsonHeaders(token),
        timeout: CONFIG.TIMEOUTS.request
    });
    requestDuration.add(res.timings.duration);
    if (res.status >= 400) {
        apiErrors.add(1);
    }
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
    var flowComplete = true;
    
    // ─────────────────────────────────────────────────────
    // 1. LOGIN
    // ─────────────────────────────────────────────────────
    group('1. Student Login', function() {
        token = doLogin(user);
        if (!token) {
            console.error('VU ' + __VU + ': Student login failed');
            flowComplete = false;
        }
    });
    
    if (!token) {
        studentFlowComplete.add(0);
        return;
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 2. FETCH PLACEMENT QUESTIONS
    // ─────────────────────────────────────────────────────
    var questions = [];
    
    group('2. Fetch Placement Questions', function() {
        var res = apiGet('/student/assessment/placement/questions', token);
        
        var success = check(res, {
            'placement questions 200': function(r) { return r.status === 200; }
        });
        
        placementFetchSuccess.add(success ? 1 : 0);
        
        if (res.status === 200) {
            try {
                var body = JSON.parse(res.body);
                questions = body.data || body.questions || [];
            } catch(e) {}
        } else {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 3. SUBMIT PLACEMENT (if questions available)
    // ─────────────────────────────────────────────────────
    if (questions.length > 0) {
        group('3. Submit Placement', function() {
            var answers = [];
            var count = Math.min(questions.length, 5);
            for (var i = 0; i < count; i++) {
                var q = questions[i];
                answers.push({
                    question_id: q.id || (i + 1),
                    answer_text: 'E2E Test Answer - VU' + __VU + ' - ' + Date.now()
                });
            }
            
            var res = apiPost('/student/assessment/placement/submit', { answers: answers }, token);
            
            var success = check(res, {
                'placement submit ok': function(r) { return r.status === 200 || r.status === 201 || r.status === 422; }
            });
            
            // 422 means already submitted - still counts as "handled"
            placementSubmitSuccess.add(success ? 1 : 0);
            
            if (!success) {
                flowComplete = false;
            }
        });
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 4. FETCH ROADMAP
    // ─────────────────────────────────────────────────────
    var roadmap = null;
    var taskId = null;
    
    group('4. Fetch Roadmap', function() {
        var res = apiGet('/student/roadmap', token);
        
        var success = check(res, {
            'roadmap 200': function(r) { return r.status === 200; }
        });
        
        roadmapFetchSuccess.add(success ? 1 : 0);
        
        if (res.status === 200) {
            try {
                var body = JSON.parse(res.body);
                roadmap = body.data || body;
                
                // Find first available task
                if (roadmap && roadmap.blocks) {
                    for (var i = 0; i < roadmap.blocks.length; i++) {
                        var block = roadmap.blocks[i];
                        if (block.tasks && block.tasks.length > 0) {
                            taskId = block.tasks[0].id;
                            break;
                        }
                    }
                }
            } catch(e) {}
        } else {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 5. SUBMIT TASK
    // ─────────────────────────────────────────────────────
    var submissionId = null;
    
    if (taskId) {
        group('5. Submit Task', function() {
            var res = apiPost('/student/tasks/' + taskId + '/submit', {
                content: 'E2E Test Submission - VU' + __VU + ' - ' + Date.now(),
                code: 'console.log("E2E Test Code");'
            }, token);
            
            var success = check(res, {
                'task submit ok': function(r) { return r.status === 200 || r.status === 201 || r.status === 202; }
            });
            
            taskSubmitSuccess.add(success ? 1 : 0);
            
            if (res.status === 200 || res.status === 201 || res.status === 202) {
                try {
                    var body = JSON.parse(res.body);
                    submissionId = body.data ? body.data.id : (body.submission ? body.submission.id : body.id);
                } catch(e) {}
            } else {
                flowComplete = false;
            }
        });
    } else {
        taskSubmitSuccess.add(0);
        flowComplete = false;
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 6. CHECK EVALUATION (Poll)
    // ─────────────────────────────────────────────────────
    if (submissionId) {
        group('6. Check Evaluation', function() {
            var maxPolls = 5;
            var evaluated = false;
            
            for (var poll = 0; poll < maxPolls && !evaluated; poll++) {
                var res = apiGet('/student/submissions/' + submissionId, token);
                
                if (res.status === 200) {
                    try {
                        var body = JSON.parse(res.body);
                        var status = body.data ? body.data.status : (body.status || 'pending');
                        if (status === 'evaluated' || status === 'completed') {
                            evaluated = true;
                        }
                    } catch(e) {}
                }
                
                if (!evaluated && poll < maxPolls - 1) {
                    sleep(1);
                }
            }
            
            evaluationCheckSuccess.add(evaluated ? 1 : 0);
            
            if (!evaluated) {
                flowComplete = false;
            }
        });
    }
    
    // Record flow completion
    studentFlowComplete.add(flowComplete ? 1 : 0);
    
    if (flowComplete) {
        console.log('VU ' + __VU + ': Student flow COMPLETE');
    }
    
    sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
    var summary = {
        scenario: 'E2E Student Flow',
        timestamp: new Date().toISOString(),
        metrics: {
            total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            failed_requests: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
            login_success_rate: data.metrics.login_success ? data.metrics.login_success.values.rate : 0,
            placement_fetch_rate: data.metrics.placement_fetch_success ? data.metrics.placement_fetch_success.values.rate : 0,
            placement_submit_rate: data.metrics.placement_submit_success ? data.metrics.placement_submit_success.values.rate : 0,
            roadmap_fetch_rate: data.metrics.roadmap_fetch_success ? data.metrics.roadmap_fetch_success.values.rate : 0,
            task_submit_rate: data.metrics.task_submit_success ? data.metrics.task_submit_success.values.rate : 0,
            evaluation_check_rate: data.metrics.evaluation_check_success ? data.metrics.evaluation_check_success.values.rate : 0,
            flow_complete_rate: data.metrics.student_flow_complete ? data.metrics.student_flow_complete.values.rate : 0,
            p95_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0
        }
    };
    
    console.log('\n========== E2E STUDENT FLOW SUMMARY ==========');
    console.log('Total Requests: ' + summary.metrics.total_requests);
    console.log('Flow Complete Rate: ' + (summary.metrics.flow_complete_rate * 100).toFixed(2) + '%');
    console.log('p95 Duration: ' + (summary.metrics.p95_duration || 0).toFixed(2) + 'ms');
    console.log('===============================================\n');
    
    return {
        'reports/student_flow_summary.json': JSON.stringify(summary, null, 2)
    };
}
