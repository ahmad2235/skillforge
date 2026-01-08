/**
 * E2E Authentication Test Scenario
 * Created: 2025-12-29
 * Purpose: Test login flows for Student, Business, and Admin roles
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, THRESHOLDS, getUserForVU, jsonHeaders } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

var loginSuccess = new Rate('login_success');
var loginDuration = new Trend('login_duration');
var studentLoginSuccess = new Rate('student_login_success');
var businessLoginSuccess = new Rate('business_login_success');
var adminLoginSuccess = new Rate('admin_login_success');
var authErrors = new Counter('auth_errors');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

var profile = __ENV.E2E_PROFILE || 'e2e';

export var options = {
    scenarios: {
        auth_test: {
            executor: 'ramping-vus',
            stages: LOAD_STAGES[profile] || LOAD_STAGES.e2e,
            gracefulRampDown: '10s'
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.15'],
        'login_success': ['rate>0.90'],
        'login_duration': ['p(95)<1000']
    },
    tags: {
        scenario: 'e2e_auth',
        environment: 'e2e_isolated'
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function doLogin(user, roleName, metricRate) {
    var url = CONFIG.BASE_URL + '/auth/login';
    var payload = JSON.stringify({
        email: user.email,
        password: user.password
    });
    
    var startTime = Date.now();
    var res = http.post(url, payload, {
        headers: jsonHeaders(null),
        timeout: CONFIG.TIMEOUTS.request
    });
    var duration = Date.now() - startTime;
    
    loginDuration.add(duration);
    
    var success = check(res, {
        'login status 200': function(r) { return r.status === 200; },
        'login has token': function(r) {
            try {
                var body = JSON.parse(r.body);
                return body.token ? true : false;
            } catch(e) {
                return false;
            }
        }
    });
    
    loginSuccess.add(success ? 1 : 0);
    metricRate.add(success ? 1 : 0);
    
    if (!success) {
        authErrors.add(1);
        console.error('VU ' + __VU + ' [' + roleName + ']: Login failed - ' + res.status + ' ' + res.body);
    }
    
    var token = null;
    if (res.status === 200) {
        try {
            var body = JSON.parse(res.body);
            token = body.token;
        } catch(e) {}
    }
    
    return { success: success, token: token, duration: duration };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────────────────────────────────────

export default function() {
    // Rotate through different user types based on iteration
    var iteration = __ITER;
    var userType = iteration % 3;
    
    if (userType === 0) {
        // Student login test
        group('Student Login', function() {
            var user = getUserForVU(__VU, 'students');
            var result = doLogin(user, 'Student', studentLoginSuccess);
            
            if (result.success) {
                console.log('VU ' + __VU + ' [Student]: Login OK in ' + result.duration + 'ms');
            }
        });
    } else if (userType === 1) {
        // Business login test
        group('Business Login', function() {
            var user = getUserForVU(__VU, 'business');
            var result = doLogin(user, 'Business', businessLoginSuccess);
            
            if (result.success) {
                console.log('VU ' + __VU + ' [Business]: Login OK in ' + result.duration + 'ms');
            }
        });
    } else {
        // Admin login test
        group('Admin Login', function() {
            var user = getUserForVU(__VU, 'admins');
            var result = doLogin(user, 'Admin', adminLoginSuccess);
            
            if (result.success) {
                console.log('VU ' + __VU + ' [Admin]: Login OK in ' + result.duration + 'ms');
            }
        });
    }
    
    sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
    var summary = {
        scenario: 'E2E Authentication',
        timestamp: new Date().toISOString(),
        metrics: {
            total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            failed_requests: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
            login_success_rate: data.metrics.login_success ? data.metrics.login_success.values.rate : 0,
            login_p95_duration: data.metrics.login_duration ? data.metrics.login_duration.values['p(95)'] : 0,
            student_success_rate: data.metrics.student_login_success ? data.metrics.student_login_success.values.rate : 0,
            business_success_rate: data.metrics.business_login_success ? data.metrics.business_login_success.values.rate : 0,
            admin_success_rate: data.metrics.admin_login_success ? data.metrics.admin_login_success.values.rate : 0
        }
    };
    
    console.log('\n========== E2E AUTH TEST SUMMARY ==========');
    console.log('Total Requests: ' + summary.metrics.total_requests);
    console.log('Login Success Rate: ' + (summary.metrics.login_success_rate * 100).toFixed(2) + '%');
    console.log('Login p95 Duration: ' + (summary.metrics.login_p95_duration || 0).toFixed(2) + 'ms');
    console.log('============================================\n');
    
    return {
        'reports/auth_summary.json': JSON.stringify(summary, null, 2)
    };
}
