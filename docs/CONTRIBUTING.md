# Contributing Guide

> How to contribute to SkillForge

---

## Table of Contents

- [Getting Started](#getting-started)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Branching Strategy](#branching-strategy)
- [Issue Reporting](#issue-reporting)
- [Development Tips](#development-tips)

---

## Getting Started

### Prerequisites

1. Read the [README.md](README.md) for project overview
2. Follow [INSTALLATION.md](INSTALLATION.md) to set up your environment
3. Understand the [ARCHITECTURE.md](ARCHITECTURE.md) module structure

### First Contribution

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment
4. Find an issue labeled `good first issue` or `help wanted`
5. Create a branch and start coding

---

## Code Standards

### PHP (Laravel Backend)

#### Style Guide

- Follow [PSR-12](https://www.php-fig.org/psr/psr-12/) coding standard
- Use Laravel's built-in coding conventions
- Run PHP CS Fixer before committing

```bash
cd backend
./vendor/bin/php-cs-fixer fix
```

#### Naming Conventions

| Type        | Convention          | Example                    |
|-------------|---------------------|----------------------------|
| Classes     | PascalCase          | `UserController`           |
| Methods     | camelCase           | `getUserById()`            |
| Variables   | camelCase           | `$userId`                  |
| Constants   | UPPER_SNAKE_CASE    | `MAX_ATTEMPTS`             |
| Tables      | snake_case (plural) | `project_assignments`      |
| Columns     | snake_case          | `created_at`               |

#### Module Structure

When adding new functionality:

1. **Controller** → `app/Modules/{Module}/Interface/Http/Controllers/`
2. **Service** → `app/Modules/{Module}/Application/Services/`
3. **Model** → `app/Modules/{Module}/Infrastructure/Models/`
4. **Routes** → `app/Modules/{Module}/Interface/routes.php`

#### Documentation

- Add PHPDoc blocks to all public methods
- Include `@param`, `@return`, and `@throws` annotations

```php
/**
 * Submit a task for evaluation.
 *
 * @param  int    $taskId
 * @param  array  $data
 * @return Submission
 * @throws ValidationException
 */
public function submitTask(int $taskId, array $data): Submission
{
    // ...
}
```

### JavaScript/TypeScript (React Frontend)

#### Style Guide

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Run ESLint and Prettier before committing

```bash
cd frontend
npm run lint
npm run format
```

#### Naming Conventions

| Type        | Convention    | Example                  |
|-------------|---------------|--------------------------|
| Components  | PascalCase    | `UserProfile.tsx`        |
| Hooks       | camelCase     | `useAuth.ts`             |
| Utils       | camelCase     | `formatDate.ts`          |
| Constants   | UPPER_CASE    | `API_BASE_URL`           |
| CSS Classes | kebab-case    | `user-profile-card`      |

#### Component Structure

```tsx
// imports (external → internal → styles)
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from './Component.module.css';

// types
interface Props {
  userId: number;
}

// component
export function Component({ userId }: Props) {
  // hooks
  // state
  // effects
  // handlers
  // render
}
```

### Python (AI Services)

#### Style Guide

- Follow [PEP 8](https://pep8.org/)
- Use type hints for all functions
- Run Black and isort before committing

```bash
black .
isort .
```

#### Naming Conventions

| Type        | Convention    | Example                  |
|-------------|---------------|--------------------------|
| Functions   | snake_case    | `calculate_score()`      |
| Classes     | PascalCase    | `EvaluationService`      |
| Variables   | snake_case    | `user_score`             |
| Constants   | UPPER_CASE    | `MAX_RETRIES`            |

---

## Pull Request Process

### Before Creating PR

1. **Run tests** - All tests must pass

```bash
# Backend
cd backend && composer test

# Frontend
cd frontend && npm test
```

2. **Run linters** - No linting errors

```bash
# Backend
./vendor/bin/php-cs-fixer fix --dry-run

# Frontend
npm run lint
```

3. **Update documentation** - If API changes, update docs
4. **Clear caches** - Ensure clean state

```bash
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Feature tests added/updated
- [ ] Manual testing performed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
```

### Review Process

1. Create PR against `develop` branch (or `main` for hotfixes)
2. Request review from at least one team member
3. Address all review comments
4. Squash commits if requested
5. Merge after approval

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples**:

```
feat(projects): add multi-invite functionality

Implement first-accept-wins logic for project invitations.
Business owners can now invite multiple candidates.

Closes #456
```

```
fix(auth): resolve token expiration issue

Tokens were expiring prematurely due to timezone mismatch.

Fixes #789
```

---

## Branching Strategy

### Branch Types

| Branch       | Purpose                    | Base        | Merges To   |
|--------------|----------------------------|-------------|-------------|
| `main`       | Production code            | -           | -           |
| `develop`    | Integration branch         | `main`      | `main`      |
| `feature/*`  | New features               | `develop`   | `develop`   |
| `bugfix/*`   | Bug fixes                  | `develop`   | `develop`   |
| `hotfix/*`   | Production fixes           | `main`      | `main`, `develop` |
| `release/*`  | Release preparation        | `develop`   | `main`, `develop` |

### Branch Naming

```
feature/short-description
bugfix/issue-number-description
hotfix/critical-fix
release/v1.2.0
```

**Examples**:
- `feature/multi-invite-system`
- `bugfix/123-login-redirect`
- `hotfix/security-patch`
- `release/v2.0.0`

### Workflow

```
main ─────────────────────────────────────────────────▶
  │                                         ▲
  └─ develop ────────────────────────────────┤
       │               ▲         ▲          │
       └─ feature/xyz ─┘         │          │
       └─ bugfix/123 ────────────┘          │
       └─ release/v1.0 ─────────────────────┘
```

---

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- PHP Version: [e.g., 8.2]
- Node Version: [e.g., 18.x]

## Screenshots
If applicable

## Additional Context
Any other relevant information
```

### Feature Requests

Use the feature request template:

```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches considered

## Additional Context
Mockups, diagrams, etc.
```

### Labels

| Label           | Description                           |
|-----------------|---------------------------------------|
| `bug`           | Something isn't working               |
| `feature`       | New feature request                   |
| `enhancement`   | Improvement to existing feature       |
| `documentation` | Documentation updates                 |
| `good first issue` | Good for newcomers                 |
| `help wanted`   | Extra attention needed                |
| `priority:high` | Critical issue                        |
| `priority:low`  | Nice to have                          |

---

## Development Tips

### Local Development

```bash
# Start all services (backend)
cd backend && composer dev

# This runs in parallel:
# - php artisan serve
# - php artisan queue:work
# - php artisan pail (logs)
# - npm run dev (Vite)
```

### Debugging

#### Backend (Laravel)

```php
// Quick debug
dd($variable);     // dump and die
dump($variable);   // dump without dying
logger($message);  // write to log

// Telescope (if installed)
// Visit /telescope for request inspection
```

#### Frontend (React)

```tsx
// React DevTools for component inspection
// Network tab for API calls
console.log(data);
```

### Testing Locally

```bash
# Run specific test
php artisan test --filter=TestClassName

# Run with coverage
php artisan test --coverage

# Frontend tests
npm test -- --watch
```

### Database

```bash
# Fresh migration with seed
php artisan migrate:fresh --seed

# Create migration
php artisan make:migration create_example_table

# Rollback last migration
php artisan migrate:rollback
```

### Cache Management

```bash
# Clear all caches
php artisan optimize:clear

# Individual clears
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

---

## Questions?

- Check existing issues and documentation
- Ask in team chat/discussions
- Create a new issue with `question` label

---

**Last Updated**: January 2026
