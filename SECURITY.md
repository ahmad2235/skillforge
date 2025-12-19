# SkillForge Security Policy

## Overview

This document provides comprehensive security guidelines for the SkillForge project, covering authentication, authorization, data protection, vulnerability disclosure, and deployment security best practices.

---

## 1. Authentication & Authorization

### Authentication Strategy
- **Method**: Laravel Sanctum with Bearer tokens (stateless API authentication)
- **Token Storage**: Bearer tokens via `Authorization: Bearer <token>` header
- **Password Policy**:
  - Minimum 8 characters (enforced via Laravel validation)
  - Hashed with bcrypt (BCRYPT_ROUNDS=12)
  - Never stored or logged in plain text
  - Users can reset via authenticated reset flow

### Role-Based Access Control (RBAC)
Three primary roles protect all endpoints:
- **student**: Learning pathway access, submission rights
- **business**: Project creation, candidate management
- **admin**: Full system access, user management, moderation

All role checks use the `RoleMiddleware` in `app/Http/Middleware/RoleMiddleware.php`.

### Authorization (Object-Level)
Fine-grained policies protect resources:
| Resource | Policy | Rules |
|----------|--------|-------|
| Submission | `SubmissionPolicy` | Owner OR admin can view/delete |
| Project | `ProjectPolicy` | Business owner OR admin can manage |
| Assignment | `ProjectAssignmentPolicy` | Student owner, project owner, or admin |
| Portfolio | `PortfolioPolicy` | Owner OR admin |

Use `$this->authorize('action', $resource)` in controllers before updating/deleting.

---

## 2. Input Validation & Data Integrity

### Form Request Validation
All API endpoints validate input via FormRequest classes in `Interface/Http/Requests/`:
- `RegisterRequest`
- `LoginRequest`
- `SubmitTaskRequest`
- Custom validation rules per module

### Validation Rules
- Strict allow-lists: `safe()->only([...])` rejects unexpected fields
- Type checking: `string`, `email`, `integer`, `array`
- Range validation: `min`, `max`, `unique` per domain rules
- Custom rules for domain/role/level enums
- File uploads: `mimes`, `max:5120` (5MB limit), validated extension

### Database Column Safety
Column names must match migration definitions exactly. Never assume or guess column names.
Check [database/migrations/](backend/database/migrations/) before INSERT/UPDATE operations.

---

## 3. API Security Headers

### CORS Policy
Configured in [config/cors.php](backend/config/cors.php):
```
FRONTEND_URL=http://localhost:5173  (dev) or production domain
allowed_origins: [FRONTEND_URL]
supports_credentials: false (Bearer tokens used, not cookies)
```

### Security Headers
All API responses include headers via `SecurityHeadersMiddleware`:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Rate Limiting
Protects against brute force and DoS:
- **auth/login**: 5/min per email+IP, 20/min per IP
- **auth/register**: 3/min per IP
- **submissions**: 10/min per authenticated user
- **assignments**: 30/min per authenticated user (business scope)
- **placement_submit**: 5/min per user

---

## 4. Error Handling

### Backend (Laravel)
- Custom exception handler in [app/Exceptions/Handler.php](backend/app/Exceptions/Handler.php)
- **Production** (APP_DEBUG=false): Returns safe JSON with generic messages, no stack traces
- **Development** (APP_DEBUG=true): Detailed errors logged, never exposed in JSON responses
- HTTP status codes: 401 (auth), 403 (forbidden), 422 (validation), 500 (server error)

### Frontend (React)
- Global `ErrorBoundary` prevents white-screen crashes
- User-facing errors via `getSafeErrorMessage()` (no raw backend traces)
- Console logging via `safeLogError()` (redacts sensitive data in development only)

---

## 5. Data Protection

### Logging & Audit Trail
Security-relevant events logged to [storage/logs/](backend/storage/logs/):
```
auth.register_success     (user_id, IP, timestamp)
auth.login_success        (user_id, IP, timestamp)
auth.login_failed         (email hash, IP, timestamp)
rate_limit_triggered      (IP, path, timestamp)
auth.forbidden_attempt    (IP, path, resource, timestamp)
```

**What is NOT logged**: passwords, tokens, API keys, full PII.

### XSS Prevention (Frontend)
- No `dangerouslySetInnerHTML` usage
- All user-generated content rendered as plain text (React escapes by default)
- Future HTML content must use `SafeHTML` component with DOMPurify

### CSRF Protection
- Not applicable (stateless Bearer token authentication)
- If cookies are added in future, CSRF tokens must be enforced

### Sensitive Data in Transit
- **HTTPS Requirement** (enforced in production):
  - Set `APP_URL=https://...` in `.env`
  - Ensure SSL/TLS certificates are valid
  - Configure HSTS header (preload list)
- Tokens never logged or exposed in URLs
- Request bodies encrypted in transit via HTTPS

---

## 6. File Upload Security

### Restrictions
- Allowed MIME types: `jpeg,jpg,png,pdf,zip` (whitelist, no exe/bat/sh)
- Maximum file size: 5MB
- Files stored outside web root in [storage/app/](backend/storage/app/)
- Symlink: [public/storage](backend/public/storage) → [storage/app/public/](backend/storage/app/public/)

### Execution Prevention
- Disable PHP execution in upload directories via `.htaccess` or web server config:
  ```apache
  <FilesMatch "\.php$">
    Deny from all
  </FilesMatch>
  ```

---

## 7. Third-Party Services & AI Integration

### External Service Calls
- **Evaluator Service** ([services/project-evaluator/](backend/services/project-evaluator/)): Python-based code evaluation
- **Recommendation Service**: Candidate ranking for projects
- API keys/secrets stored in `.env`, never committed to git

### `.env` Secrets (Never Commit)
```
API_KEYS for third-party services
DB_PASSWORD
MAIL_PASSWORD
SANCTUM_STATEFUL_DOMAINS (for sessions if added)
```

Use `.env.example` (committed) as template; `.env` in `.gitignore`.

---

## 8. Database Security

### Connection Security
- Connections use TCP with host/port validation
- Stored credentials in `.env` (not committed)
- Prepared statements via Eloquent ORM (SQL injection prevention)

### Backups
- Regular automated backups (outside this repo scope)
- Backups encrypted and stored securely
- Restore procedures tested regularly

### Migrations
- All schema changes via migrations in [database/migrations/](backend/database/migrations/)
- Reversible via `php artisan migrate:rollback`
- Run in order; never skip or modify history

---

## 9. Deployment Security Checklist

### Pre-Deployment
- [ ] Set `APP_DEBUG=false` in production `.env`
- [ ] Set `APP_ENV=production`
- [ ] Update `APP_URL` to production domain
- [ ] Set `FRONTEND_URL` to production frontend domain
- [ ] Update `CORS` allowed origins to production domain only
- [ ] Regenerate `APP_KEY` for production (if reusing codebase)
- [ ] Ensure database credentials are strong and unique
- [ ] Configure mail service credentials securely

### Hosting
- [ ] Enable HTTPS/SSL (certificate from Let's Encrypt or paid provider)
- [ ] Set HSTS header with preload
- [ ] Disable directory listing and `.htaccess` view
- [ ] Configure firewall to restrict non-essential ports
- [ ] Use dedicated hosting account (not shared)
- [ ] Enable WAF (Web Application Firewall) if available

### Dependencies
- [ ] Run `composer install --no-dev` (production does not need dev packages)
- [ ] Verify no known vulnerabilities: `composer audit`
- [ ] Pin versions in [composer.json](backend/composer.json) or use Composer lock file
- [ ] Run `npm audit` for frontend dependencies, fix or disable unsafe packages

### Monitoring
- [ ] Set up centralized logging (stack traces, errors, security events)
- [ ] Enable error tracking (e.g., Sentry, Laravel Horizon)
- [ ] Monitor rate limiting events and IP blocks
- [ ] Set up alerts for repeated failed login attempts
- [ ] Monitor database query performance and suspicious patterns

---

## 10. Vulnerability Disclosure

### Reporting a Vulnerability
If you discover a security vulnerability in SkillForge:

1. **Do NOT** open a public issue on GitHub
2. **Email** security details to: **[security-contact@skillforge.app]** (replace with actual contact)
3. **Include**:
   - Vulnerability type (e.g., SQL injection, XSS, authentication bypass)
   - Affected component and version
   - Steps to reproduce
   - Potential impact (critical, high, medium, low)
   - Proof-of-concept (if possible, without causing damage)

4. **Expected Response**:
   - Acknowledgment within 48 hours
   - Status update within 5 business days
   - Fix timeline and release plan
   - Public disclosure coordinated after patch release

### Disclosure Timeline
- **Day 1-2**: Acknowledge receipt, assess severity
- **Day 3-7**: Develop and test fix
- **Day 8-14**: Release patch to all users
- **Day 15+**: Public advisory (if high/critical severity)

---

## 11. Development Security Practices

### Git & Version Control
- Never commit `.env`, secrets, or API keys
- Use `.gitignore` to exclude:
  ```
  .env
  .env.*.php
  /storage/logs/*
  /storage/app/*
  /vendor/
  node_modules/
  ```
- Require signed commits (GPG) for critical branches (optional but recommended)

### Code Review
- All changes require peer review before merge
- Security-relevant changes (auth, API, database) require explicit security sign-off
- Automated tests in CI/CD pipeline (PHPUnit, ESLint)

### Dependencies
- Update dependencies regularly: `composer update`, `npm update`
- Review changelogs for security patches
- Test thoroughly after updates

### Environment Variables
- Use `.env.example` as template (no secrets)
- Document each variable with expected values
- Rotate secrets periodically

---

## 12. Module-Specific Security Notes

### Identity Module
- Authentication & password reset logic
- Role enforcement
- Token management
- See [backend/app/Modules/Identity/](backend/app/Modules/Identity/) for implementation

### Learning Module
- Submission validation and evaluation
- Task ownership checks
- See [backend/app/Modules/Learning/](backend/app/Modules/Learning/)

### Projects Module
- Business owner authorization
- Candidate filtering and assignment
- See [backend/app/Modules/Projects/](backend/app/Modules/Projects/)

### AI Module
- External service integration
- Evaluation and recommendation logic
- See [backend/app/Modules/AI/](backend/app/Modules/AI/)

### Assessment Module
- Placement test delivery
- Answer validation
- See [backend/app/Modules/Assessment/](backend/app/Modules/Assessment/)

### Gamification Module
- Badge and portfolio visibility rules
- See [backend/app/Modules/Gamification/](backend/app/Modules/Gamification/)

---

## 13. Compliance & Standards

### GDPR (EU)
If serving EU users:
- [ ] Implement data export functionality (user downloads all personal data)
- [ ] Implement data deletion (GDPR "right to be forgotten")
- [ ] Document data processing agreements (DPA) with third-party services
- [ ] Obtain explicit consent for non-essential cookies/analytics

### OWASP Top 10 Coverage
- **A01 Broken Access Control**: Policies and role middleware
- **A02 Cryptographic Failures**: HTTPS, bcrypt hashing
- **A03 Injection**: Prepared statements (Eloquent), input validation
- **A04 Insecure Design**: Auth flow, rate limiting
- **A05 Security Misconfiguration**: Security headers, CORS, `APP_DEBUG=false`
- **A06 Vulnerable Components**: Regular audits (`composer audit`, `npm audit`)
- **A07 Identification & Auth**: Sanctum, password policy, rate limiting
- **A08 Data Integrity Failures**: Form validation, authorization policies
- **A09 Logging & Monitoring**: Security event logging
- **A10 SSRF**: External service validation (not implemented yet)

---

## 14. Incident Response

### If a Breach Is Suspected
1. **Isolate**: Take affected systems offline if necessary
2. **Assess**: Determine scope, affected data, and timeline
3. **Notify**: Alert users and stakeholders immediately
4. **Preserve**: Keep logs and evidence for forensics
5. **Remediate**: Apply fixes and deploy patches
6. **Communicate**: Provide status updates until resolved

### Post-Incident
- Conduct root-cause analysis (RCA)
- Document lessons learned
- Update security practices to prevent recurrence
- Test fixes thoroughly before re-deployment

---

## 15. Additional Resources

- [Laravel Security Best Practices](https://laravel.com/docs/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Dependency Check Tools](https://cwe.mitre.org/top25/)

---

## Last Updated
December 19, 2025

For questions or suggestions, contact the security team.
