# Testing Guide

> Running tests, coverage, and debugging for SkillForge

---

## Table of Contents

- [Overview](#overview)
- [Backend Testing (Laravel)](#backend-testing-laravel)
- [Frontend Testing (React)](#frontend-testing-react)
- [AI Services Testing (FastAPI)](#ai-services-testing-fastapi)
- [End-to-End Testing](#end-to-end-testing)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Debugging Tips](#debugging-tips)

---

## Overview

### Testing Strategy

| Layer     | Framework       | Purpose                        |
|-----------|-----------------|--------------------------------|
| Backend   | PHPUnit         | Unit and feature tests         |
| Frontend  | Vitest/Jest     | Component and integration tests|
| AI Services| pytest         | API and unit tests             |
| E2E       | Cypress/Playwright | Full user flow tests        |

### Test Types

- **Unit Tests**: Test individual functions/methods in isolation
- **Feature Tests**: Test API endpoints and integrations
- **Integration Tests**: Test module interactions
- **E2E Tests**: Test complete user workflows

---

## Backend Testing (Laravel)

### Running Tests

```bash
cd backend

# Run all tests
composer test
# or
php artisan test

# Run with verbose output
php artisan test --verbose

# Run specific test file
php artisan test tests/Feature/AuthTest.php

# Run specific test method
php artisan test --filter=test_user_can_register

# Run tests in parallel
php artisan test --parallel
```

### Test Directory Structure

```
backend/tests/
├── Feature/                    # Feature/integration tests
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   └── RegisterTest.php
│   ├── Learning/
│   │   ├── RoadmapTest.php
│   │   └── SubmissionTest.php
│   └── Projects/
│       ├── ProjectTest.php
│       └── AssignmentTest.php
├── Unit/                       # Unit tests
│   ├── Services/
│   │   └── EvaluationServiceTest.php
│   └── Models/
│       └── UserTest.php
├── TestCase.php               # Base test class
└── CreatesApplication.php     # Application bootstrap
```

### Writing Tests

#### Feature Test Example

```php
<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user']);
    }

    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }
}
```

#### Unit Test Example

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Modules\AI\Application\Services\TaskEvaluationService;
use App\Models\Submission;
use Mockery;

class TaskEvaluationServiceTest extends TestCase
{
    public function test_evaluation_returns_score_and_feedback(): void
    {
        $service = new TaskEvaluationService();
        $submission = Mockery::mock(Submission::class);
        $submission->shouldReceive('getAttribute')->with('content')->andReturn('code');

        $result = $service->evaluateSubmission($submission);

        $this->assertArrayHasKey('score', $result);
        $this->assertArrayHasKey('feedback', $result);
        $this->assertArrayHasKey('metadata', $result);
    }
}
```

### Test Database

Configure test database in `phpunit.xml`:

```xml
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="sqlite"/>
    <env name="DB_DATABASE" value=":memory:"/>
</php>
```

Or use a separate MySQL database:

```xml
<php>
    <env name="DB_DATABASE" value="skillforge_test"/>
</php>
```

### Factories

```php
// database/factories/UserFactory.php
public function definition(): array
{
    return [
        'name' => fake()->name(),
        'email' => fake()->unique()->safeEmail(),
        'password' => bcrypt('password'),
        'role' => 'student',
        'domain' => fake()->randomElement(['frontend', 'backend']),
        'level' => fake()->randomElement(['beginner', 'intermediate', 'advanced']),
    ];
}
```

---

## Frontend Testing (React)

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run specific test file
npm test -- src/components/Auth.test.tsx

# Run with coverage
npm test -- --coverage
```

### Test Directory Structure

```
frontend/src/
├── components/
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Login.test.tsx
│   └── Dashboard/
│       ├── Dashboard.tsx
│       └── Dashboard.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
└── __tests__/
    └── integration/
        └── AuthFlow.test.tsx
```

### Writing Tests

#### Component Test Example

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from './Login';
import { AuthProvider } from '@/contexts/AuthContext';

describe('Login Component', () => {
  it('renders login form', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});
```

#### Hook Test Example

```tsx
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from '@/contexts/AuthContext';

describe('useAuth Hook', () => {
  it('returns user when logged in', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Mocking API Calls

```tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-token',
        user: { id: 1, name: 'Test User' },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## AI Services Testing (FastAPI)

### Running Tests

```bash
cd backend/services/project-evaluator
# or
cd recommender/skillforge-cosine-recommender

# Activate virtual environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Run tests
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html
```

### Test Structure

```
services/project-evaluator/
├── app/
│   ├── main.py
│   └── services/
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   └── test_evaluation.py
└── pytest.ini
```

### Writing Tests

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_evaluate_submission():
    response = client.post(
        "/evaluate",
        json={
            "code": "def hello(): return 'world'",
            "task_type": "function",
            "expected_output": "world"
        }
    )
    assert response.status_code == 200
    assert "score" in response.json()
    assert "feedback" in response.json()


@pytest.fixture
def sample_submission():
    return {
        "code": "print('hello')",
        "task_type": "output",
        "expected_output": "hello"
    }


def test_evaluation_with_fixture(sample_submission):
    response = client.post("/evaluate", json=sample_submission)
    assert response.status_code == 200
```

---

## End-to-End Testing

### Setup (Cypress)

```bash
cd frontend
npm install cypress --save-dev

# Open Cypress
npx cypress open

# Run headless
npx cypress run
```

### E2E Test Example

```javascript
// cypress/e2e/auth.cy.js
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('allows user to register', () => {
    cy.get('[data-testid="register-link"]').click();
    cy.get('[name="name"]').type('Test User');
    cy.get('[name="email"]').type('test@example.com');
    cy.get('[name="password"]').type('password123');
    cy.get('[name="password_confirmation"]').type('password123');
    cy.get('[data-testid="register-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, Test User');
  });

  it('allows user to login', () => {
    cy.get('[name="email"]').type('existing@example.com');
    cy.get('[name="password"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
  });
});
```

---

## Test Coverage

### Backend Coverage

```bash
cd backend

# Generate coverage report
php artisan test --coverage

# Generate HTML report
php artisan test --coverage-html=coverage

# View report
open coverage/index.html
```

### Frontend Coverage

```bash
cd frontend

# Generate coverage report
npm test -- --coverage

# Coverage thresholds (in package.json or jest.config.js)
{
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

### Coverage Goals

| Module      | Target Coverage |
|-------------|-----------------|
| Auth        | 90%+            |
| Learning    | 80%+            |
| Projects    | 80%+            |
| Assessment  | 85%+            |
| AI Services | 75%+            |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: secret
          MYSQL_DATABASE: skillforge_test
        ports:
          - 3306:3306
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, mysql
          coverage: xdebug
      
      - name: Install dependencies
        run: |
          cd backend
          composer install --no-interaction
      
      - name: Run tests
        run: |
          cd backend
          php artisan test --coverage-clover=coverage.xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: backend/coverage.xml

  frontend:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run tests
        run: |
          cd frontend
          npm test -- --coverage
```

### Pre-commit Hooks

```bash
# Install husky
npm install husky --save-dev

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test"
```

---

## Debugging Tips

### Backend Debugging

```php
// Quick debugging
dd($variable);           // Dump and die
dump($variable);         // Dump without stopping
logger($message);        // Log to storage/logs/laravel.log
Log::info('message', ['data' => $data]);

// Query debugging
DB::enableQueryLog();
// ... your code
dd(DB::getQueryLog());

// Test-specific debugging
$this->withoutExceptionHandling();  // Show full exceptions
```

### Frontend Debugging

```tsx
// Console debugging
console.log('Debug:', data);
console.table(arrayData);
debugger;  // Breakpoint

// React DevTools
// Install browser extension for component inspection

// Network debugging
// Use browser Network tab to inspect API calls
```

### Common Test Issues

#### Tests Pass Locally but Fail in CI

- Check environment variables
- Ensure database is fresh
- Check timezone settings
- Verify all dependencies installed

#### Flaky Tests

- Use `RefreshDatabase` trait
- Mock external services
- Use explicit waits instead of timeouts
- Avoid testing time-dependent code

#### Slow Tests

- Use `:memory:` SQLite database
- Mock external API calls
- Run tests in parallel
- Use factories efficiently

---

## Quick Reference

### Commands Summary

```bash
# Backend
composer test                    # Run all tests
php artisan test --filter=Name   # Run specific test
php artisan test --coverage      # With coverage

# Frontend
npm test                         # Run all tests
npm test -- --watch              # Watch mode
npm test -- --coverage           # With coverage

# AI Services
pytest                           # Run all tests
pytest -v                        # Verbose
pytest --cov                     # With coverage

# E2E
npx cypress open                 # Interactive mode
npx cypress run                  # Headless mode
```

---

**Last Updated**: January 2026
