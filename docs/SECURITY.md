# Security Policy

> Security guidelines, best practices, and vulnerability disclosure for SkillForge

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation](#input-validation)
- [API Security](#api-security)
- [Data Protection](#data-protection)
- [File Upload Security](#file-upload-security)
- [Third-Party Services](#third-party-services)
- [Deployment Security](#deployment-security)
- [Vulnerability Disclosure](#vulnerability-disclosure)
- [Compliance](#compliance)
- [Incident Response](#incident-response)

---

## Overview

SkillForge takes security seriously. This document outlines security practices, guidelines for contributors, and procedures for reporting vulnerabilities.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access rights for users and services
3. **Secure by Default**: Safe defaults for all configurations
4. **Fail Securely**: Graceful handling of errors without exposing sensitive data

---

## Authentication & Authorization

### Authentication Strategy

| Aspect           | Implementation                              |
|------------------|---------------------------------------------|
| Method           | Laravel Sanctum with Bearer tokens          |
| Token Storage    | `Authorization: Bearer <token>` header      |
| Token Expiration | 7 days (configurable)                       |
| Password Hashing | bcrypt with 12 rounds                       |

### Password Requirements

- Minimum 8 characters
- No maximum length restriction
- Passwords never logged or stored in plain text
- Reset tokens expire after 60 minutes

### Role-Based Access Control (RBAC)

Three primary roles:

| Role     | Access Level                          |
|----------|---------------------------------------|
| student  | Learning content, submissions, portfolio |
| business | Projects, candidates, assignments     |
| admin    | Full system access                    |

### Authorization Policies

Fine-grained access control via Laravel Policies:

| Resource   | Policy                   | Rules                              |
|------------|--------------------------|-----------------------------------|
| Submission | `SubmissionPolicy`       | Owner or admin can view/delete    |
| Project    | `ProjectPolicy`          | Business owner or admin can manage |
| Assignment | `ProjectAssignmentPolicy` | Relevant parties only            |
| Portfolio  | `PortfolioPolicy`        | Owner or admin                    |

### Middleware Stack

```php
Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student')
    ->group(function () {
        // Protected student routes
    });
```

---

## Input Validation

### Request Validation

All input validated via FormRequest classes:

```php
class SubmitTaskRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:65535'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
```

### Validation Rules Applied

- **Type Checking**: `string`, `integer`, `email`, `array`
- **Range Validation**: `min`, `max`, `between`
- **Format Validation**: `email`, `url`, `regex`
- **Unique Constraints**: `unique:table,column`
- **Enum Validation**: Custom rules for role/level/domain

### SQL Injection Prevention

- All database queries use Eloquent ORM with parameterized queries
- Raw queries are sanitized with parameter binding
- Never concatenate user input into SQL strings

### XSS Prevention

- Backend: HTML entities escaped in all output
- Frontend: React escapes content by default
- No `dangerouslySetInnerHTML` without sanitization

---

## API Security

### CORS Policy

Configured in `config/cors.php`:

```php
return [
    'paths' => ['api/*'],
    'allowed_origins' => [env('FRONTEND_URL')],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    'allowed_headers' => ['Content-Type', 'Authorization'],
    'supports_credentials' => false,
];
```

### Security Headers

Applied via `SecurityHeadersMiddleware`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'
```

### Rate Limiting

Protection against brute force and DoS attacks:

| Endpoint        | Limit        | Window     |
|-----------------|--------------|------------|
| /auth/login     | 5 requests   | Per minute |
| /auth/register  | 3 requests   | Per minute |
| /student/*      | 60 requests  | Per minute |
| /business/*     | 60 requests  | Per minute |
| General API     | 1000/IP      | Per minute |

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "message": "Too many requests. Please wait before trying again."
}
```

---

## Data Protection

### Data at Rest

- Database credentials stored in `.env` (not in version control)
- Sensitive data encrypted where applicable
- Regular database backups (encrypted)

### Data in Transit

- HTTPS required in production
- TLS 1.2+ for all API communications
- Tokens transmitted only via secure headers

### Logging Policy

**What IS logged:**
```
auth.login_success      (user_id, IP, timestamp)
auth.login_failed       (email hash, IP, timestamp)
rate_limit_triggered    (IP, path, timestamp)
auth.forbidden_attempt  (IP, resource, timestamp)
```

**What is NOT logged:**
- Passwords (plain or hashed)
- Full authentication tokens
- API keys or secrets
- Personal identifiable information (PII)

### Data Retention

- Logs retained for 30 days
- User data retained until account deletion
- Backups retained for 90 days

---

## File Upload Security

### Restrictions

| Setting          | Value                        |
|------------------|------------------------------|
| Max File Size    | 5MB                          |
| Allowed Types    | jpeg, jpg, png, pdf, zip     |
| Storage Location | Outside web root             |
| Execution        | PHP execution disabled       |

### Validation

```php
'file' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf,zip', 'max:5120']
```

### Storage Security

- Files stored in `storage/app/` (not publicly accessible)
- Public files accessed via signed URLs or symlink
- Malware scanning recommended for production

---

## Third-Party Services

### AI Services

| Service         | Security Measures                     |
|-----------------|---------------------------------------|
| Evaluator       | Internal network, no public exposure  |
| Recommender     | API key authentication               |
| Project Leveler | Rate limited, input sanitized        |

### External APIs

- API keys stored in `.env`
- Keys rotated regularly
- Minimum required permissions

### Dependencies

- Regular dependency audits: `composer audit`, `npm audit`
- Automated vulnerability scanning in CI/CD
- Pin versions in lock files

---

## Deployment Security

### Pre-Deployment Checklist

- [ ] `APP_DEBUG=false`
- [ ] `APP_ENV=production`
- [ ] Strong `APP_KEY` (regenerated)
- [ ] Database credentials unique and strong
- [ ] HTTPS/SSL configured
- [ ] CORS origins restricted to production domain
- [ ] Rate limiting enabled
- [ ] Error pages don't expose stack traces
- [ ] Logging level set to `error` or `warning`

### Infrastructure Security

- [ ] Firewall configured (ports 80, 443 only)
- [ ] SSH key authentication (no password)
- [ ] Database not publicly accessible
- [ ] Regular security updates
- [ ] WAF (Web Application Firewall) if available

### Monitoring

- [ ] Error tracking (Sentry, Bugsnag)
- [ ] Security event logging
- [ ] Intrusion detection
- [ ] Uptime monitoring

---

## Vulnerability Disclosure

### Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **Email** security details to: `security@skillforge.app`
3. **Include**:
   - Vulnerability type
   - Affected component and version
   - Steps to reproduce
   - Potential impact
   - Proof-of-concept (without causing damage)

### What to Expect

| Timeline    | Action                                    |
|-------------|-------------------------------------------|
| Day 1-2     | Acknowledgment of receipt                 |
| Day 3-7     | Initial assessment and severity rating    |
| Day 8-14    | Fix development and testing               |
| Day 15-21   | Patch release                             |
| Day 22+     | Public disclosure (coordinated)           |

### Severity Ratings

| Severity | Description                            | Response Time |
|----------|----------------------------------------|---------------|
| Critical | System compromise, data breach         | 24-48 hours   |
| High     | Significant security impact            | 3-5 days      |
| Medium   | Limited security impact                | 1-2 weeks     |
| Low      | Minimal security impact                | Next release  |

### Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities.

<!-- Placeholder: Add recognized contributors -->

---

## Compliance

### OWASP Top 10 Coverage

| Risk                          | Mitigation                              |
|-------------------------------|----------------------------------------|
| A01 Broken Access Control     | Policies, role middleware              |
| A02 Cryptographic Failures    | HTTPS, bcrypt hashing                  |
| A03 Injection                 | Prepared statements, input validation  |
| A04 Insecure Design           | Auth flow, rate limiting               |
| A05 Security Misconfiguration | Headers, CORS, APP_DEBUG=false         |
| A06 Vulnerable Components     | Regular audits, dependency updates     |
| A07 Auth Failures             | Sanctum, password policy, rate limits  |
| A08 Data Integrity Failures   | Validation, authorization policies     |
| A09 Logging Failures          | Security event logging                 |
| A10 SSRF                      | External service validation            |

### GDPR Considerations

If serving EU users:

- [ ] Data export functionality
- [ ] Data deletion (right to be forgotten)
- [ ] Consent management
- [ ] Data processing agreements with third parties

### PCI DSS

Not currently applicable (no payment processing). If added:

- Implement tokenization for card data
- Use PCI-compliant payment gateway
- Never store full card numbers

---

## Incident Response

### If a Security Incident Occurs

1. **Identify**: Determine scope and nature of incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore systems from clean backups
5. **Document**: Record timeline and actions
6. **Notify**: Alert affected users and stakeholders

### Communication Plan

| Audience     | When to Notify           | Method        |
|--------------|--------------------------|---------------|
| Security Team| Immediately              | Direct contact|
| Management   | Within 4 hours           | Email/call    |
| Affected Users| Within 24-72 hours      | Email         |
| Public       | After remediation        | Blog post     |

### Post-Incident

- Conduct root-cause analysis (RCA)
- Document lessons learned
- Update security measures
- Review and improve incident response plan

---

## Security Contacts

| Role                | Contact                          |
|---------------------|----------------------------------|
| Security Team Lead  | security@skillforge.app          |
| Emergency Contact   | emergency@skillforge.app         |
| Bug Bounty Program  | bounty@skillforge.app (if applicable) |

---

## Additional Resources

- [Laravel Security Best Practices](https://laravel.com/docs/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated**: January 2026

---

*This document is reviewed quarterly and updated as needed.*
