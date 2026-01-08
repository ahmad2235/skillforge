/**
 * E2E Business Flow Test Scenario
 * Created: 2025-12-29
 * Purpose: Test business user journey - view projects → submit review → check assignments
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, getUserForVU, jsonHeaders } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

var loginSuccess = new Rate('login_success');
var projectsFetchSuccess = new Rate('projects_fetch_success');
var projectDetailSuccess = new Rate('project_detail_success');
var assignmentsFetchSuccess = new Rate('assignments_fetch_success');
var reviewSubmitSuccess = new Rate('review_submit_success');
var businessFlowComplete = new Rate('business_flow_complete');
var apiErrors = new Counter('api_errors');
var requestDuration = new Trend('request_duration');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

var profile = __ENV.E2E_PROFILE || 'e2e';

export var options = {
    scenarios: {
        business_flow: {
            executor: 'ramping-vus',
            stages: LOAD_STAGES[profile] || LOAD_STAGES.e2e,
            gracefulRampDown: '10s'
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.20'],
        'login_success': ['rate>0.90'],
        'projects_fetch_success': ['rate>0.80'],
        'assignments_fetch_success': ['rate>0.80']
    },
    tags: {
        scenario: 'e2e_business_flow',
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
    var user = getUserForVU(__VU, 'business');
    var token = null;
    var flowComplete = true;
    
    // ─────────────────────────────────────────────────────
    // 1. BUSINESS LOGIN
    // ─────────────────────────────────────────────────────
    group('1. Business Login', function() {
        token = doLogin(user);
        if (!token) {
            console.error('VU ' + __VU + ': Business login failed');
            flowComplete = false;
        }
    });
    
    if (!token) {
        businessFlowComplete.add(0);
        return;
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 2. VIEW PROJECTS LIST
    // ─────────────────────────────────────────────────────
    var projects = [];
    
    group('2. View Projects', function() {
        var res = apiGet('/business/projects', token);
        
        var success = check(res, {
            'projects list 200': function(r) { return r.status === 200; }
        });
        
        projectsFetchSuccess.add(success ? 1 : 0);
        
        if (res.status === 200) {
            try {
                var body = JSON.parse(res.body);
                projects = body.data || body.projects || [];
            } catch(e) {}
        } else {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 3. VIEW PROJECT DETAIL
    // ─────────────────────────────────────────────────────
    var projectId = null;
    
    if (projects.length > 0) {
        projectId = projects[0].id;
        
        group('3. View Project Detail', function() {
            var res = apiGet('/business/projects/' + projectId, token);
            
            var success = check(res, {
                'project detail 200': function(r) { return r.status === 200; }
            });
            
            projectDetailSuccess.add(success ? 1 : 0);
            
            if (!success) {
                flowComplete = false;
            }
        });
    } else {
        projectDetailSuccess.add(0);
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 4. VIEW ASSIGNMENTS
    // ─────────────────────────────────────────────────────
    var assignments = [];
    
    group('4. View Assignments', function() {
        var path = projectId ? '/business/projects/' + projectId + '/assignments' : '/business/assignments';
        var res = apiGet(path, token);
        
        var success = check(res, {
            'assignments list 200': function(r) { return r.status === 200; }
        });
        
        assignmentsFetchSuccess.add(success ? 1 : 0);
        
        if (res.status === 200) {
            try {
                var body = JSON.parse(res.body);
                assignments = body.data || body.assignments || [];
            } catch(e) {}
        } else {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 5. SUBMIT REVIEW (if assignments available)
    // ─────────────────────────────────────────────────────
    if (assignments.length > 0) {
        var assignmentId = assignments[0].id;
        
        group('5. Submit Review', function() {
            var res = apiPost('/business/assignments/' + assignmentId + '/review', {
                rating: 4,
                feedback: 'E2E Test Review - VU' + __VU + ' - ' + Date.now(),
                status: 'approved'
            }, token);
            
            var success = check(res, {
                'review submit ok': function(r) { 
                    return r.status === 200 || r.status === 201 || r.status === 422; 
                }
            });
            
            reviewSubmitSuccess.add(success ? 1 : 0);
            
            if (!success) {
                flowComplete = false;
            }
        });
    } else {
        reviewSubmitSuccess.add(0);
    }
    
    // Record flow completion
    businessFlowComplete.add(flowComplete ? 1 : 0);
    
    if (flowComplete) {
        console.log('VU ' + __VU + ': Business flow COMPLETE');
    }
    
    sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
    var summary = {
        scenario: 'E2E Business Flow',
        timestamp: new Date().toISOString(),
        metrics: {
            total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            failed_requests: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
            login_success_rate: data.metrics.login_success ? data.metrics.login_success.values.rate : 0,
            projects_fetch_rate: data.metrics.projects_fetch_success ? data.metrics.projects_fetch_success.values.rate : 0,
            project_detail_rate: data.metrics.project_detail_success ? data.metrics.project_detail_success.values.rate : 0,
            assignments_fetch_rate: data.metrics.assignments_fetch_success ? data.metrics.assignments_fetch_success.values.rate : 0,
            review_submit_rate: data.metrics.review_submit_success ? data.metrics.review_submit_success.values.rate : 0,
            flow_complete_rate: data.metrics.business_flow_complete ? data.metrics.business_flow_complete.values.rate : 0,
            p95_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0
        }
    };
    
    console.log('\n========== E2E BUSINESS FLOW SUMMARY ==========');
    console.log('Total Requests: ' + summary.metrics.total_requests);
    console.log('Flow Complete Rate: ' + (summary.metrics.flow_complete_rate * 100).toFixed(2) + '%');
    console.log('p95 Duration: ' + (summary.metrics.p95_duration || 0).toFixed(2) + 'ms');
    console.log('================================================\n');
    
    return {
        'reports/business_flow_summary.json': JSON.stringify(summary, null, 2)
    };
}
