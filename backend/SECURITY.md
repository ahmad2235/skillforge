# Backend Security Hardening (SkillForge)

This document summarizes security measures applied to the Laravel backend.

## Authentication
- Uses Laravel Sanctum with Bearer tokens (unchanged).
- Password hashing uses Laravel `hashed` cast (bcrypt by default). `BCRYPT_ROUNDS=12` configured.
- Rate limiting:
  - `login`: 5/min per email+IP, 20/min per IP.
  - `register`: 3/min per IP.
- Logout revokes only the current token (`currentAccessToken()->delete()`).

## Authorization (Object-Level)
- Policies added:
  - `SubmissionPolicy` (owner or admin).
  - `ProjectPolicy` (business owner or admin).
  - `ProjectAssignmentPolicy` (student owner, project owner, or admin).
  - `PortfolioPolicy` (owner or admin).
- Controllers use policy checks for submissions and owner project features.
- Admin routes already protected via `role:admin` middleware.

## Input Validation
- Converted inline validation to FormRequest classes:
  - `RegisterRequest`, `LoginRequest`, `SubmitTaskRequest`.
- Strict allow-lists via `safe()->only([...])` to reject unexpected fields.
- Normalized validation error responses (422 JSON via Handler).

## Error Handling
- Custom `App\Exceptions\Handler` returns safe JSON messages for API errors.
- No stack traces or debug info in production JSON (APP_DEBUG=false recommended).
- Suppress PHP 8.5 deprecation noise to avoid corrupting JSON responses.

## API & Headers
- CORS configured via `config/cors.php`:
  - `allowed_origins`: FRONTEND_URL only (defaults to http://127.0.0.1:5173)
  - `supports_credentials`: false (Bearer tokens used)
  - Methods/headers restricted to common API needs.
- Security headers added via `SecurityHeadersMiddleware` for all API responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- Rate limiting applied to sensitive endpoints:
  - `submissions`: 10/min per user
  - `assignments`: 30/min per user (business scope)
  - `placement_submit`: 5/min per user
- Admin routes remain protected by `role:admin` middleware and authorization policies.

## Logging (Security-Relevant)
- Logs:
  - `auth.register_success` (user_id, IP).
  - `auth.login_success` (user_id, IP).
  - `auth.login_failed` (email hash, IP).
  - `rate_limit_triggered` (IP, path).
  - `auth.forbidden_attempt` (IP, path).
- Logs avoid passwords, tokens, and full PII.

## TODOs (Out-of-Scope for This Task)
- Enforce HTTPS and HSTS in production.
- Add CSP headers and security-related response headers.
- Consider cookie-based auth for web-only apps (not applicable here).
- Centralized audit logging with tamper-resistance.

---

# Frontend Security (SkillForge)

This section documents security measures applied to the React frontend without changing backend APIs or authentication strategy.

## Error Containment
- Global `ErrorBoundary` wraps the app to prevent white-screen crashes and shows a generic fallback.
- Minimal dev-only logging for unexpected UI errors; no sensitive data exposed.

## Auth UX Safety
- Axios response interceptor handles `401`/`403` by clearing localStorage (`sf_token`, `sf_user`) and redirecting to `/auth/login` with `next` param.
- `AuthProvider` listens for a global `sf:auth-logout` event to synchronize forced logouts.
- Logout clears client state only; backend token revocation remains handled server-side.

## XSS Safety
- No `dangerouslySetInnerHTML` usage across pages.
- Any future HTML rendering must use `SafeHTML` (DOMPurify) component to sanitize content.
- User-generated fields are rendered as plain text (React escapes by default).

## Sensitive Data Hygiene
- No tokens or secrets are logged to console. A `safeLogError()` utility redacts payloads and logs minimal info in development only.
- Error messages surfaced to users are normalized via `getSafeErrorMessage()` and never expose raw backend traces.

## Route Guards
- `ProtectedRoute` enforces authentication and role-based access for `student`, `business`, and `admin` routes.
- Guards prevent UI access even if backend would block the request.

### Guarded Routes
- Student: `/student`, `/student/roadmap`, `/student/blocks/:blockId/tasks`, `/student/tasks/:taskId/submit`, `/student/assignments`, `/student/portfolios`, `/student/projects/assignments/:assignment/portfolio`, `/student/assessment/placement`, `/student/placement`.
- Business: `/business`, `/business/projects`, `/business/projects/new`, `/business/projects/:projectId`, `/business/projects/:projectId/candidates`, `/business/projects/:projectId/assignments`.
- Admin: `/admin`, `/admin/dashboard`, `/admin/students`, `/admin/learning/blocks`, `/admin/learning/blocks/:blockId/tasks`, `/admin/assessment/questions`, `/admin/monitoring`.
