/**
 * E2E Admin Flow Test Scenario
 * Created: 2025-12-29
 * Purpose: Test admin journey - manage users → monitor submissions → validate dashboards
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { CONFIG, LOAD_STAGES, getUserForVU, jsonHeaders } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

var loginSuccess = new Rate('login_success');
var usersListSuccess = new Rate('users_list_success');
var userDetailSuccess = new Rate('user_detail_success');
var submissionsListSuccess = new Rate('submissions_list_success');
var dashboardSuccess = new Rate('dashboard_success');
var statsSuccess = new Rate('stats_success');
var adminFlowComplete = new Rate('admin_flow_complete');
var apiErrors = new Counter('api_errors');
var requestDuration = new Trend('request_duration');

// ─────────────────────────────────────────────────────────────────────────────
// TEST OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

var profile = __ENV.E2E_PROFILE || 'e2e';

export var options = {
    scenarios: {
        admin_flow: {
            executor: 'ramping-vus',
            stages: LOAD_STAGES[profile] || LOAD_STAGES.e2e,
            gracefulRampDown: '10s'
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.15'],
        'login_success': ['rate>0.95'],
        'users_list_success': ['rate>0.90'],
        'dashboard_success': ['rate>0.90']
    },
    tags: {
        scenario: 'e2e_admin_flow',
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
    var user = getUserForVU(__VU, 'admins');
    var token = null;
    var flowComplete = true;
    
    // ─────────────────────────────────────────────────────
    // 1. ADMIN LOGIN
    // ─────────────────────────────────────────────────────
    group('1. Admin Login', function() {
        token = doLogin(user);
        if (!token) {
            console.error('VU ' + __VU + ': Admin login failed');
            flowComplete = false;
        }
    });
    
    if (!token) {
        adminFlowComplete.add(0);
        return;
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 2. LIST ALL USERS
    // ─────────────────────────────────────────────────────
    var users = [];
    
    group('2. List Users', function() {
        var res = apiGet('/admin/users', token);
        
        var success = check(res, {
            'users list 200': function(r) { return r.status === 200; }
        });
        
        usersListSuccess.add(success ? 1 : 0);
        
        if (res.status === 200) {
            try {
                var body = JSON.parse(res.body);
                users = body.data || body.users || [];
            } catch(e) {}
        } else {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 3. VIEW USER DETAIL
    // ─────────────────────────────────────────────────────
    if (users.length > 0) {
        var userId = users[0].id;
        
        group('3. View User Detail', function() {
            var res = apiGet('/admin/users/' + userId, token);
            
            var success = check(res, {
                'user detail 200': function(r) { return r.status === 200; }
            });
            
            userDetailSuccess.add(success ? 1 : 0);
            
            if (!success) {
                flowComplete = false;
            }
        });
    } else {
        userDetailSuccess.add(0);
    }
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 4. MONITOR SUBMISSIONS
    // ─────────────────────────────────────────────────────
    group('4. Monitor Submissions', function() {
        var res = apiGet('/admin/submissions', token);
        
        var success = check(res, {
            'submissions list 200': function(r) { return r.status === 200; }
        });
        
        submissionsListSuccess.add(success ? 1 : 0);
        
        if (!success) {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 5. VALIDATE DASHBOARD
    // ─────────────────────────────────────────────────────
    group('5. Dashboard', function() {
        var res = apiGet('/admin/dashboard', token);
        
        var success = check(res, {
            'dashboard 200': function(r) { return r.status === 200; }
        });
        
        dashboardSuccess.add(success ? 1 : 0);
        
        if (!success) {
            flowComplete = false;
        }
    });
    
    sleep(0.5);
    
    // ─────────────────────────────────────────────────────
    // 6. VIEW STATISTICS
    // ─────────────────────────────────────────────────────
    group('6. View Statistics', function() {
        var res = apiGet('/admin/stats', token);
        
        var success = check(res, {
            'stats 200': function(r) { return r.status === 200; }
        });
        
        statsSuccess.add(success ? 1 : 0);
        
        if (!success) {
            flowComplete = false;
        }
    });
    
    // Record flow completion
    adminFlowComplete.add(flowComplete ? 1 : 0);
    
    if (flowComplete) {
        console.log('VU ' + __VU + ': Admin flow COMPLETE');
    }
    
    sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
    var summary = {
        scenario: 'E2E Admin Flow',
        timestamp: new Date().toISOString(),
        metrics: {
            total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            failed_requests: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
            login_success_rate: data.metrics.login_success ? data.metrics.login_success.values.rate : 0,
            users_list_rate: data.metrics.users_list_success ? data.metrics.users_list_success.values.rate : 0,
            user_detail_rate: data.metrics.user_detail_success ? data.metrics.user_detail_success.values.rate : 0,
            submissions_list_rate: data.metrics.submissions_list_success ? data.metrics.submissions_list_success.values.rate : 0,
            dashboard_rate: data.metrics.dashboard_success ? data.metrics.dashboard_success.values.rate : 0,
            stats_rate: data.metrics.stats_success ? data.metrics.stats_success.values.rate : 0,
            flow_complete_rate: data.metrics.admin_flow_complete ? data.metrics.admin_flow_complete.values.rate : 0,
            p95_duration: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0
        }
    };
    
    console.log('\n========== E2E ADMIN FLOW SUMMARY ==========');
    console.log('Total Requests: ' + summary.metrics.total_requests);
    console.log('Flow Complete Rate: ' + (summary.metrics.flow_complete_rate * 100).toFixed(2) + '%');
    console.log('p95 Duration: ' + (summary.metrics.p95_duration || 0).toFixed(2) + 'ms');
    console.log('=============================================\n');
    
    return {
        'reports/admin_flow_summary.json': JSON.stringify(summary, null, 2)
    };
}
