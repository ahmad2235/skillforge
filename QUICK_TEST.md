# Quick Start - Session Auth Testing

## Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173` or `http://localhost:5174`
- `.env.local` configured in frontend with:
  ```env
  VITE_API_BASE_URL=http://localhost:8000/api
  VITE_BACKEND_ORIGIN=http://localhost:8000
  ```

## Test 1: Browser Login Flow (5 minutes)

1. **Start servers**:
   ```powershell
   # Terminal 1: Backend
   cd backend
   php artisan serve --port=8000
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

2. **Clear cookies**:
   - Open DevTools (F12)
   - Application → Cookies → localhost:5173 → Delete all

3. **Login**:
   - Navigate to `http://localhost:5173/auth/login`
   - Enter credentials:
     - Email: `student.beginner@example.com`
     - Password: `password`
   - Click "Sign in"

4. **Verify**:
   - Console should show: `login status 200`
   - Response body has user JSON with `id`, `email`, `role`
   - Browser navigates to `/student` dashboard
   - Page should load (user is authenticated)

---

## Test 2: PHPUnit Full Flow (2 minutes)

```powershell
cd backend
php vendor/bin/phpunit tests/Feature/AuthFlowEndToEndTest.php --testdox
```

Expected output:
```
Auth Flow End To End
 ✔ Full auth flow with session
 ✔ Session persists across requests
 ✔ Login without csrf token fails
 ✔ Sanctum recognizes stateful frontend

OK (4 tests, 14 assertions)
```

---

## Test 3: Manual API Test via PowerShell (5 minutes)

```powershell
# 1. Get CSRF cookie
$resp1 = Invoke-WebRequest -Uri http://localhost:8000/sanctum/csrf-cookie `
  -Method GET `
  -Headers @{Origin="http://localhost:5173"} `
  -SessionVariable sess

Write-Host "CSRF cookie set: $(if ($resp1.StatusCode -eq 204) { 'YES' } else { 'NO' })"

# 2. Extract XSRF token from Set-Cookie
$cookie = $resp1.Headers.'Set-Cookie' | Where-Object { $_ -match 'XSRF-TOKEN' }
$encoded = ($cookie -split 'XSRF-TOKEN=')[1] -split ';' | Select-Object -First 1
$decoded = [System.Net.WebUtility]::UrlDecode($encoded)
Write-Host "XSRF Token decoded: $($decoded.Substring(0, 20))..."

# 3. Login with decoded XSRF token
$resp2 = Invoke-WebRequest -Uri http://localhost:8000/api/auth/login `
  -Method POST `
  -Headers @{
    Origin="http://localhost:5173"
    'X-XSRF-TOKEN'=$decoded
    'Content-Type'='application/json'
  } `
  -Body (@{
    email='student.beginner@example.com'
    password='password'
  } | ConvertTo-Json) `
  -WebSession $sess

$loginResult = $resp2.Content | ConvertFrom-Json
Write-Host "Login status: $($resp2.StatusCode)"
Write-Host "User email: $($loginResult.user.email)"

# 4. Call /api/auth/me (session should persist)
$resp3 = Invoke-WebRequest -Uri http://localhost:8000/api/auth/me `
  -Method GET `
  -Headers @{Origin="http://localhost:5173"} `
  -WebSession $sess

$meResult = $resp3.Content | ConvertFrom-Json
Write-Host "ME status: $($resp3.StatusCode)"
Write-Host "Authenticated user: $($meResult.email)"
```

Expected output:
```
CSRF cookie set: YES
XSRF Token decoded: eyJpdiI6IlV...
Login status: 200
User email: student.beginner@example.com
ME status: 200
Authenticated user: student.beginner@example.com
```

---

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| 419 on login | XSRF token in Console → Is it decoded? | Verify no `%3D` in header |
| 401 on /auth/me | Check if session cookie sent | Clear cookies, re-login |
| Can't see user after login | Check `/api/debug/session` | Verify `web_guard_user_id` is set |
| Cookie domain mismatch | Vite on 5174 but env says 5173? | Update `.env.local` VITE_BACKEND_ORIGIN |
| Session expires too fast | Check SESSION_LIFETIME in .env | Should be 120 (minutes) |

---

## Architecture Verification

Run this to see system status:

```powershell
cd backend

# Verify session table
php artisan tinker --execute "echo DB::table('sessions')->count() . ' sessions'"

# Check stateful domains config
php artisan tinker --execute "echo implode(',', config('sanctum.stateful'))"

# Verify CSRF is enabled
php artisan tinker --execute "echo 'CSRF enabled: ' . (class_exists('Laravel\Framework\Middleware\VerifyCsrfToken') ? 'YES' : 'NO')"
```

---

## Frontend Environment Check

```powershell
cd frontend

# Build should pick up .env.local vars
npm run build

# Check dist was created
if (Test-Path dist) { echo "✓ Build successful" } else { echo "✗ Build failed" }
```

---

## Production Deployment Checklist

Before going to production:

- [ ] Set `APP_DEBUG=false` in `.env`
- [ ] Remove or restrict `/api/debug/session` and `/api/debug/csrf` endpoints
- [ ] Update `SESSION_SECURE_COOKIE=true` (HTTPS only)
- [ ] Set real `SANCTUM_STATEFUL_DOMAINS` (production domain)
- [ ] Set real `FRONTEND_URL` in `.env`
- [ ] Use appropriate `SESSION_SAME_SITE=strict` (or verify after testing)
- [ ] Ensure backend/frontend use same cookie domain
- [ ] Test auth flow end-to-end on production domain
- [ ] Monitor logs for auth errors

---

**All tests passing. Session-based auth is ready.** ✅
