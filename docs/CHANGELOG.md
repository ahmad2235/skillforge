# Changelog

> All notable changes to SkillForge will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

---

## Table of Contents

- [Unreleased](#unreleased)
- [Version History](#version-history)
- [Migration Notes](#migration-notes)

---

## Unreleased

### Added
<!-- New features that have been added -->
- Placeholder for upcoming features

### Changed
<!-- Changes in existing functionality -->
- Placeholder for changes

### Deprecated
<!-- Features that will be removed in upcoming releases -->
- Placeholder for deprecations

### Removed
<!-- Features that have been removed -->
- Placeholder for removals

### Fixed
<!-- Bug fixes -->
- Placeholder for fixes

### Security
<!-- Security-related changes -->
- Placeholder for security updates

---

## Version History

### [2.0.0] - January 2026

#### Added
- **Multi-Invite System**: Business owners can invite multiple students to the same project
  - First-accept-wins logic ensures fair assignment
  - Token-based security with SHA-256 hashing
  - Email deep links for one-click acceptance
  - Auto-cancellation of pending invites
- **Real-time Chat**: 1-to-1 messaging between students and business owners
  - Socket.IO integration
  - Message persistence
  - Conversation management
- **AI Integration**: Pluggable AI services architecture
  - Task evaluation via FastAPI service
  - Candidate ranking recommendations
  - PDF project complexity analysis

#### Changed
- **Assignment Status Enum**: Updated from 4 to 5 states
  - `pending`, `accepted`, `declined`, `cancelled`, `completed`
  - Auto-migration backfills old values
- **Accept Endpoint**: Now requires `token` parameter for security
- **API Response Format**: Standardized JSON structure across all endpoints

#### Fixed
- Race condition in project assignment (database locking)
- Token expiration timezone handling
- Password reset email delivery issues

#### Security
- Implemented rate limiting on all authentication endpoints
- Added security headers middleware
- Enhanced input validation on all form requests

---

### [1.5.0] - December 2025

#### Added
- **Portfolio Export**: Generate PDF portfolios for students
- **Badge System**: Achievement badges for milestones
- **Placement Test Improvements**: Timer and progress tracking

#### Changed
- Upgraded to Laravel 12
- Improved roadmap block ordering
- Enhanced submission feedback display

#### Fixed
- Duplicate submission prevention
- Roadmap progress calculation accuracy
- Mobile responsive layout issues

---

### [1.4.0] - November 2025

#### Added
- **Project Deadline Management**: Set and track project deadlines
- **Candidate Filtering**: Filter candidates by domain and level
- **Admin Dashboard**: Platform statistics and user management

#### Changed
- Refactored module structure for better separation
- Improved API error messages
- Updated authentication flow

#### Fixed
- Session timeout handling
- File upload size validation
- Cross-browser compatibility issues

---

### [1.3.0] - October 2025

#### Added
- **AI Task Evaluation**: Automatic scoring of code submissions
- **Recommendation Engine**: AI-powered candidate ranking
- **Email Notifications**: Invitation and assignment alerts

#### Changed
- Migrated to Clean Architecture pattern
- Restructured frontend components
- Optimized database queries

#### Fixed
- Memory leak in evaluation service
- Pagination offset errors
- Date formatting inconsistencies

---

### [1.2.0] - September 2025

#### Added
- **Business Owner Module**: Project creation and management
- **Student Invitations**: Single invitation system
- **Assignment Workflow**: Accept/decline functionality

#### Changed
- Enhanced user registration flow
- Improved form validation messages
- Updated UI design system

#### Fixed
- Authentication token refresh issues
- Form submission race conditions
- Image upload orientation

---

### [1.1.0] - August 2025

#### Added
- **Learning Roadmaps**: Structured learning paths
- **Task Submissions**: Code and text submission support
- **Progress Tracking**: Block and task completion status

#### Changed
- Reorganized backend modules
- Simplified API endpoints
- Improved error handling

#### Fixed
- User profile update issues
- Navigation routing bugs
- Cache invalidation problems

---

### [1.0.0] - July 2025

#### Added
- Initial release
- **User Authentication**: Registration, login, password reset
- **Role Management**: Student, business, admin roles
- **Placement Tests**: Domain-specific skill assessment
- **Basic Frontend**: React SPA with routing

---

## Migration Notes

### Upgrading to 2.0.0

#### Breaking Changes

1. **Accept Endpoint Change**
   
   Before:
   ```http
   POST /student/projects/assignments/{id}/accept
   ```
   
   After:
   ```http
   POST /student/projects/assignments/{id}/accept
   Content-Type: application/json
   
   { "token": "invitation-token" }
   ```

2. **Assignment Status Values**
   
   Old values are auto-migrated:
   - `invited` → `pending`
   - `rejected` → `declined`
   - `removed` → `cancelled`

#### Migration Steps

```bash
# 1. Backup database
php artisan backup:run

# 2. Update dependencies
composer update

# 3. Run migrations
php artisan migrate

# 4. Clear caches
php artisan optimize:clear

# 5. Update frontend
cd frontend && npm install && npm run build
```

---

### Upgrading to 1.5.0

No breaking changes. Standard update process:

```bash
composer update
php artisan migrate
npm update && npm run build
```

---

## Release Schedule

| Version | Type    | Expected Date |
|---------|---------|---------------|
| 2.1.0   | Feature | February 2026 |
| 2.0.1   | Patch   | January 2026  |
| 3.0.0   | Major   | Q2 2026       |

---

## Contributing to Changelog

When creating a PR, add your changes to the [Unreleased](#unreleased) section under the appropriate category:

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

---

**Last Updated**: January 2026
