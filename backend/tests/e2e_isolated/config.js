/**
 * E2E Isolated Test Configuration
 * Created: 2025-12-29
 * Purpose: Central configuration for isolated E2E load testing
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
    BASE_URL: __ENV.E2E_BASE_URL || 'http://localhost:8001/api',
    
    // Test password for all E2E users
    TEST_PASSWORD: 'e2e_test_pass_123',
    
    // User pools for concurrent testing (each VU gets unique user)
    USERS: {
        students: Array.from({ length: 15 }, (_, i) => ({
            email: `e2e_student_${i + 1}@test.local`,
            password: 'e2e_test_pass_123',
            role: 'student'
        })),
        business: Array.from({ length: 5 }, (_, i) => ({
            email: `e2e_business_${i + 1}@test.local`,
            password: 'e2e_test_pass_123',
            role: 'business'
        })),
        admins: Array.from({ length: 3 }, (_, i) => ({
            email: `e2e_admin_${i + 1}@test.local`,
            password: 'e2e_test_pass_123',
            role: 'admin'
        }))
    },
    
    // Timeout settings
    TIMEOUTS: {
        request: '30s',
        evaluation_poll: 60000,  // 60 seconds max wait for evaluation
        poll_interval: 2000      // 2 seconds between polls
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOAD TEST STAGES
// ─────────────────────────────────────────────────────────────────────────────

export const LOAD_STAGES = {
    // Standard E2E test profile
    e2e: [
        { duration: '30s', target: 10 },  // Ramp-up: 0 → 10 VUs over 30s
        { duration: '60s', target: 10 },  // Sustain: 10 VUs for 60s
        { duration: '30s', target: 0 }    // Ramp-down: 10 → 0 VUs over 30s
    ],
    
    // Quick smoke test
    smoke: [
        { duration: '10s', target: 2 },
        { duration: '20s', target: 2 },
        { duration: '10s', target: 0 }
    ],
    
    // Stress test
    stress: [
        { duration: '30s', target: 20 },
        { duration: '60s', target: 20 },
        { duration: '30s', target: 0 }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

export const THRESHOLDS = {
    global: {
        'http_req_duration': ['p(95)<3000'],      // 95% of requests < 3s
        'http_req_failed': ['rate<0.15'],         // Error rate < 15%
        'http_reqs': ['rate>1']                   // At least 1 req/s
    },
    
    auth: {
        'login_success': ['rate>0.90'],           // 90% login success
        'login_duration': ['p(95)<1000']          // Login p95 < 1s
    },
    
    student: {
        'placement_success': ['rate>0.80'],
        'roadmap_success': ['rate>0.80'],
        'task_submit_success': ['rate>0.70']
    },
    
    business: {
        'projects_success': ['rate>0.90'],
        'review_success': ['rate>0.80']
    },
    
    admin: {
        'users_list_success': ['rate>0.95'],
        'dashboard_success': ['rate>0.90']
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a unique user for a VU based on VU ID
 */
export function getUserForVU(vuId, userType) {
    var users = CONFIG.USERS[userType] || CONFIG.USERS.students;
    var index = (vuId - 1) % users.length;
    return users[index];
}

/**
 * Create JSON headers with optional auth token
 */
export function jsonHeaders(token) {
    var headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}
