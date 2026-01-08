/**
 * E2E Full Test Suite Runner
 * Created: 2025-12-29
 * Purpose: Run all E2E scenarios in sequence and generate combined report
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, getUserForVU, jsonHeaders } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

// Auth metrics
var loginSuccess = new Rate('login_success');

// Student metrics
var studentFlowComplete = new Rate('student_flow_complete');
var placementSuccess = new Rate('placement_success');
var roadmapSuccess = new Rate('roadmap_success');
var taskSubmitSuccess = new Rate('task_submit_success');

// Business metrics
var businessFlowComplete = new Rate('business_flow_complete');
var projectsSuccess = new Rate('projects_success');

// Admin metrics
var adminFlowComplete = new Rate('admin_flow_complete');
var dashboardSuccess = new Rate('dashboard_success');

// Global
var apiErrors = new Counter('api_errors');
var requestDuration = new Trend('request_duration');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

var profile = __ENV.E2E_PROFILE || 'e2e';

export var options = {
    scenarios: {
        e2e_full_suite: {
            executor: 'ramping-vus',
            stages: LOAD_STAGES[profile] || LOAD_STAGES.e2e,
            gracefulRampDown: '10s'
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.20'],
        'login_success': ['rate>0.85'],
        'student_flow_complete': ['rate>0.50'],
        'business_flow_complete': ['rate>0.60'],
        'admin_flow_complete': ['rate>0.70']
    },
    tags: {
        scenario: 'e2e_full_suite',
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
// FLOW FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function runStudentFlow() {
    var user = getUserForVU(__VU, 'students');
    var token = doLogin(user);
    var flowComplete = true;
    
    if (!token) {
        studentFlowComplete.add(0);
        return;
    }
    
    sleep(0.3);
    
    // Fetch placement questions
    var res = apiGet('/student/assessment/placement/questions', token);
    placementSuccess.add(res.status === 200 ? 1 : 0);
    if (res.status !== 200) flowComplete = false;
    
    sleep(0.3);
    
    // Fetch roadmap
    res = apiGet('/student/roadmap', token);
    roadmapSuccess.add(res.status === 200 ? 1 : 0);
    
    // Find task and submit
    var taskId = null;
    if (res.status === 200) {
        try {
            var body = JSON.parse(res.body);
            var roadmap = body.data || body;
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
    
    sleep(0.3);
    
    if (taskId) {
        res = apiPost('/student/tasks/' + taskId + '/submit', {
            content: 'E2E Full Suite Test - VU' + __VU,
            code: 'console.log("test");'
        }, token);
        taskSubmitSuccess.add((res.status === 200 || res.status === 201 || res.status === 202) ? 1 : 0);
    } else {
        taskSubmitSuccess.add(0);
        flowComplete = false;
    }
    
    studentFlowComplete.add(flowComplete ? 1 : 0);
}

function runBusinessFlow() {
    var user = getUserForVU(__VU, 'business');
    var token = doLogin(user);
    var flowComplete = true;
    
    if (!token) {
        businessFlowComplete.add(0);
        return;
    }
    
    sleep(0.3);
    
    // Fetch projects
    var res = apiGet('/business/projects', token);
    projectsSuccess.add(res.status === 200 ? 1 : 0);
    if (res.status !== 200) flowComplete = false;
    
    sleep(0.3);
    
    // Fetch assignments
    res = apiGet('/business/assignments', token);
    if (res.status !== 200) flowComplete = false;
    
    businessFlowComplete.add(flowComplete ? 1 : 0);
}

function runAdminFlow() {
    var user = getUserForVU(__VU, 'admins');
    var token = doLogin(user);
    var flowComplete = true;
    
    if (!token) {
        adminFlowComplete.add(0);
        return;
    }
    
    sleep(0.3);
    
    // Fetch users
    var res = apiGet('/admin/users', token);
    if (res.status !== 200) flowComplete = false;
    
    sleep(0.3);
    
    // Fetch dashboard
    res = apiGet('/admin/dashboard', token);
    dashboardSuccess.add(res.status === 200 ? 1 : 0);
    if (res.status !== 200) flowComplete = false;
    
    adminFlowComplete.add(flowComplete ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────────────────────────────────────

export default function() {
    // Rotate through flows based on iteration (weighted distribution)
    // 50% student, 30% business, 20% admin
    var iteration = __ITER;
    var flowType = iteration % 10;
    
    if (flowType < 5) {
        // 50% - Student flow
        group('Student Flow', function() {
            runStudentFlow();
        });
    } else if (flowType < 8) {
        // 30% - Business flow
        group('Business Flow', function() {
            runBusinessFlow();
        });
    } else {
        // 20% - Admin flow
        group('Admin Flow', function() {
            runAdminFlow();
        });
    }
    
    sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
    var timestamp = new Date().toISOString();
    
    var summary = {
        scenario: 'E2E Full Test Suite',
        timestamp: timestamp,
        test_profile: profile,
        metrics: {
            // Request statistics
            total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            requests_per_second: data.metrics.http_reqs ? data.metrics.http_reqs.values.rate : 0,
            failed_requests: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
            error_rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0,
            
            // Response times
            p50_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(50)'] : 0,
            p90_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(90)'] : 0,
            p95_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
            max_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max : 0,
            avg_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0,
            
            // Success rates
            login_success_rate: data.metrics.login_success ? data.metrics.login_success.values.rate : 0,
            student_flow_complete_rate: data.metrics.student_flow_complete ? data.metrics.student_flow_complete.values.rate : 0,
            business_flow_complete_rate: data.metrics.business_flow_complete ? data.metrics.business_flow_complete.values.rate : 0,
            admin_flow_complete_rate: data.metrics.admin_flow_complete ? data.metrics.admin_flow_complete.values.rate : 0,
            
            // Individual operations
            placement_success_rate: data.metrics.placement_success ? data.metrics.placement_success.values.rate : 0,
            roadmap_success_rate: data.metrics.roadmap_success ? data.metrics.roadmap_success.values.rate : 0,
            task_submit_success_rate: data.metrics.task_submit_success ? data.metrics.task_submit_success.values.rate : 0,
            projects_success_rate: data.metrics.projects_success ? data.metrics.projects_success.values.rate : 0,
            dashboard_success_rate: data.metrics.dashboard_success ? data.metrics.dashboard_success.values.rate : 0,
            
            // Iterations
            iterations: data.metrics.iterations ? data.metrics.iterations.values.count : 0,
            vus_max: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0
        },
        thresholds_passed: !data.root_group || Object.keys(data.metrics).every(function(key) {
            var metric = data.metrics[key];
            return !metric.thresholds || Object.values(metric.thresholds).every(function(v) { return !v; });
        })
    };
    
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           E2E FULL TEST SUITE - FINAL SUMMARY                ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ Timestamp: ' + timestamp.substring(0, 19).padEnd(49) + '║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ REQUEST STATISTICS                                           ║');
    console.log('║   Total Requests:     ' + String(summary.metrics.total_requests).padEnd(39) + '║');
    console.log('║   Requests/Second:    ' + summary.metrics.requests_per_second.toFixed(2).padEnd(39) + '║');
    console.log('║   Error Rate:         ' + (summary.metrics.error_rate * 100).toFixed(2).padEnd(37) + '% ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ RESPONSE TIMES                                               ║');
    console.log('║   p50:                ' + summary.metrics.p50_duration.toFixed(2).padEnd(36) + 'ms ║');
    console.log('║   p90:                ' + summary.metrics.p90_duration.toFixed(2).padEnd(36) + 'ms ║');
    console.log('║   p95:                ' + summary.metrics.p95_duration.toFixed(2).padEnd(36) + 'ms ║');
    console.log('║   Max:                ' + summary.metrics.max_duration.toFixed(2).padEnd(36) + 'ms ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ FLOW SUCCESS RATES                                           ║');
    console.log('║   Login:              ' + (summary.metrics.login_success_rate * 100).toFixed(2).padEnd(37) + '% ║');
    console.log('║   Student Flow:       ' + (summary.metrics.student_flow_complete_rate * 100).toFixed(2).padEnd(37) + '% ║');
    console.log('║   Business Flow:      ' + (summary.metrics.business_flow_complete_rate * 100).toFixed(2).padEnd(37) + '% ║');
    console.log('║   Admin Flow:         ' + (summary.metrics.admin_flow_complete_rate * 100).toFixed(2).padEnd(37) + '% ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ VUs: ' + String(summary.metrics.vus_max).padEnd(5) + '  Iterations: ' + String(summary.metrics.iterations).padEnd(27) + '║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    return {
        'reports/e2e_full_summary.json': JSON.stringify(summary, null, 2)
    };
}
