# SkillForge Sanctum Session Auth - Verification & Fix Summary

## Problem Statement
- **Symptom**: 419 CSRF mismatch on login, 401 Unauthenticated on `/api/auth/me`
- **Root Cause**: Combination of stateful domain mismatches, unencoded CSRF tokens, and frontend env drift
- **Status**: ✅ **RESOLVED**

---

## Verification Checklist

### 1. ✅ Session Configuration
**File**: `backend/.env`
```env
SESSION_DRIVER=database          # ✅ Correct (database-backed sessions)
SESSION_LIFETIME=120             # ✅ 120 minutes TTL
SESSION_SAME_SITE=lax            # ✅ Allows cross-site cookie
SESSION_SECURE_COOKIE=false      # ✅ HTTP (not HTTPS) for local dev
SESSION_DOMAIN=                  # ✅ Empty (auto-detect per request)
```

**Verification**: `php artisan tinker` → `DB::table('sessions')->count()` → **16 sessions** ✅

### 2. ✅ Sanctum Stateful Domains
**File**: `backend/.env`
```env
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,localhost:5173,127.0.0.1:5173,localhost:5174,127.0.0.1:5174,localhost:8000
```

**Includes**:
- ✅ `localhost:5173` (Vite default)
- ✅ `localhost:5174` (Vite fallback)
- ✅ `127.0.0.1` variants
- ✅ `localhost:8000` (backend origin)

### 3. ✅ CORS Configuration
**File**: `backend/config/cors.php`
```php
'allowed_origins' => [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5174',
    'http://localhost:8000',
],
'supports_credentials' => true,      # ✅ Allows cookies in cross-origin
'allowed_headers' => [               # ✅ Includes CSRF headers
    'X-CSRF-TOKEN', 'X-XSRF-TOKEN', ...
],
```

### 4. ✅ Frontend Environment
**File**: `frontend/.env.local` (NEW)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_BACKEND_ORIGIN=http://localhost:8000
```

**Purpose**: Pins frontend to single backend origin, preventing `localhost` ↔ `127.0.0.1` drift

### 5. ✅ Frontend CSRF Handling
**File**: `frontend/src/lib/apiClient.ts`
- Request interceptor: **Decodes** `XSRF-TOKEN` cookie → sets `X-XSRF-TOKEN` header
- `ensureCsrfCookie()`: Fetches `/sanctum/csrf-cookie`, extracts and decodes token, sets default header
- Response handler: Logs 419 errors and dispatches logout on 401/403

### 6. ✅ Backend CSRF & Session Middleware
**File**: `backend/bootstrap/app.php`
```php
->statefulApi()                    # ✅ Enables session auth for stateful origins
->validateCsrfTokens()             # ✅ Validates X-XSRF-TOKEN on POST/PUT/PATCH/DELETE
```

### 7. ✅ AuthController Logic
**File**: `backend/app/Modules/Identity/Interface/Http/Controllers/AuthController.php`

**login()**:
1. ✅ Validates credentials via `Auth::attempt()`
2. ✅ Regenerates session via `session()->regenerate()`
3. ✅ Returns authenticated user
4. ✅ Sets `laravel-session` cookie (HttpOnly, SameSite=Lax, path=/)

**me()**:
1. ✅ Returns `$request->user()` if authenticated
2. ✅ Returns 401 if not authenticated
3. ✅ Logs debug info (session, cookies, user)

---

## End-to-End Test Results

**All 4 tests PASS** ✅
```
✔ Full auth flow with session
✔ Session persists across requests
✔ Login without csrf token fails
✔ Sanctum recognizes stateful frontend
```

**What this verifies**:
1. CSRF cookie endpoint returns valid token ✅
2. Login with valid CSRF token succeeds (200) ✅
3. Session cookie is set and persists ✅
4. `/api/auth/me` returns authenticated user (200) ✅
5. Request Origin is recognized as stateful ✅

---

## Browser Verification (from console logs)

Your manual test showed:
```javascript
// XSRF cookie (before decoding): eyJpdiI6IlV...%3D
// XSRF cookie (after decoding):  eyJpdiI6IlV...=
// x-xsrf-token header sent:       eyJpdiI6IlV...= (decoded) ✅
// laravel-session cookie:         eyJpdiI6Im55...%3D ✅

// POST /api/auth/login → 200 ✅
// GET /api/auth/me → 200 ✅ (returns user JSON)
```

---

## Flow Diagram

```
1. Browser GET /sanctum/csrf-cookie (Origin: localhost:5173)
   └─ Server recognizes stateful → sets XSRF-TOKEN + laravel-session cookies

2. Browser POST /api/auth/login (X-XSRF-TOKEN: <decoded>)
   └─ Server validates CSRF token
   └─ Auth::attempt() succeeds
   └─ session()->regenerate() creates new session
   └─ Returns 200 + user JSON + sets new laravel-session cookie

3. Browser GET /api/auth/me (with laravel-session cookie)
   └─ Server recognizes session
   └─ auth('web')->user() returns authenticated user
   └─ Returns 200 + user JSON
```

---

## Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| **419 CSRF mismatch** | Sending URL-encoded token in header | Decode `%3D` → `=` before setting header ✅ |
| **401 on /api/auth/me** | Session not recognized | Ensure stateful domain includes frontend origin ✅ |
| **Cookies not sent** | `supports_credentials: false` | Set to `true` in cors.php ✅ |
| **Session lost between requests** | SameSite=Strict | Changed to `lax` ✅ |
| **localhost vs 127.0.0.1 drift** | Frontend uses different origins | Pinned in `.env.local` ✅ |

---

## Final Configuration Summary

### Backend (.env)
```env
SESSION_DRIVER=database
SESSION_SAME_SITE=lax
SESSION_SECURE_COOKIE=false
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,localhost:5173,127.0.0.1:5173,localhost:5174,127.0.0.1:5174,localhost:8000
```

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_BACKEND_ORIGIN=http://localhost:8000
```

### Frontend (apiClient.ts)
- ✅ `withCredentials: true`
- ✅ Request interceptor decodes XSRF cookie
- ✅ `ensureCsrfCookie()` called before login
- ✅ X-XSRF-TOKEN header set with decoded value

### Middleware (bootstrap/app.php)
- ✅ `.statefulApi()` enables session auth
- ✅ `.validateCsrfTokens()` enforces CSRF validation

---

## How to Test

### Option 1: Browser (Recommended)
```
1. Clear all cookies (DevTools → Application → Cookies → Delete all)
2. Navigate to http://localhost:5173
3. Open DevTools → Console
4. Login with test credentials
5. Verify console shows "login status 200" and response has user JSON
6. Navigation should succeed to /student dashboard
```

### Option 2: PHPUnit
```powershell
cd backend
php vendor/bin/phpunit tests/Feature/AuthFlowEndToEndTest.php --testdox
```

### Option 3: Manual API Test (PowerShell)
```powershell
$origin = "http://localhost:5173"

# Step 1: Get CSRF cookie
$csrf = Invoke-WebRequest -Uri "http://localhost:8000/sanctum/csrf-cookie" `
  -Method GET -Headers @{Origin=$origin} -Credential $null -SessionVariable session

# Step 2: Extract and decode XSRF token
$cookie = $csrf.Headers['set-cookie'] | Select-String "XSRF-TOKEN"
$token = [System.Net.WebUtility]::UrlDecode($cookie -split "XSRF-TOKEN=" | Select-Object -Last 1)

# Step 3: Login with CSRF token
$login = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" `
  -Method POST `
  -Headers @{
    Origin=$origin
    'X-XSRF-TOKEN'=$token
    'Content-Type'='application/json'
  } `
  -Body (@{email='student.beginner@example.com'; password='password'} | ConvertTo-Json) `
  -WebSession $session

# Step 4: Call /auth/me
$me = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/me" `
  -Method GET `
  -Headers @{Origin=$origin} `
  -WebSession $session

$me.Content | ConvertFrom-Json | ConvertTo-Json
```

---

## Status: ✅ RESOLVED

✅ Session-based auth working  
✅ CSRF token correctly decoded and sent  
✅ Cookies properly set and persisted  
✅ `/api/auth/me` returns authenticated user (200)  
✅ All tests passing  

**Ready for production use after removing debug endpoints and setting `APP_DEBUG=false` for prod.**
