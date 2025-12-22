# SkillForge Demo Bootstrap Guide

This document describes how to set up a fresh SkillForge instance with demo data for internal MVP testing.

## Prerequisites

- PHP 8.2+
- Composer installed
- MySQL/MariaDB or SQLite configured
- `.env` file configured with database credentials

## Quick Start

```bash
cd backend

# 1. Fresh database with migrations
php artisan migrate:fresh

# 2. Seed demo data
php artisan db:seed --class=DemoSeeder
```

## Demo Accounts

| Role        | Email                          | Password   | Notes                           |
|-------------|--------------------------------|------------|---------------------------------|
| Admin       | admin@example.com              | password   | Full admin access               |
| Business    | business@example.com           | password   | Can create projects             |
| Student     | student.beginner@example.com   | password   | Beginner, Frontend              |
| Student     | student.intermediate@example.com| password  | Intermediate, Backend           |
| Student     | student.advanced@example.com   | password   | Advanced, Frontend              |

## Expected Data Counts

After running `DemoSeeder`, verify with these SQL queries:

```sql
-- Users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;
-- Expected: admin=1, business=1, student=3

-- Roadmap blocks
SELECT COUNT(*) as count FROM roadmap_blocks;
-- Expected: 3

-- Tasks
SELECT COUNT(*) as count FROM tasks;
-- Expected: 3

-- Questions
SELECT COUNT(*) as count FROM questions;
-- Expected: 10
```

Or use Artisan tinker:

```bash
php artisan tinker
```

```php
\App\Models\User::selectRaw('role, count(*) as count')->groupBy('role')->get();
\App\Modules\Learning\Infrastructure\Models\RoadmapBlock::count();
\App\Modules\Learning\Infrastructure\Models\Task::count();
\App\Modules\Assessment\Infrastructure\Models\Question::count();
```

## API Verification

Start the server:

```bash
php artisan serve
```

### 1. Login as Student

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student.beginner@example.com","password":"password"}'
```

Expected: JSON with `token` field.

### 2. Get Student Roadmap

```bash
curl http://localhost:8000/api/student/roadmap \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>"
```

Expected: JSON with 3 blocks (HTML & CSS Fundamentals, Responsive Design, JavaScript Basics).

### 3. Login as Admin

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### 4. Get Admin Students List

```bash
curl http://localhost:8000/api/admin/students \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Expected: JSON with 3 student users.

### 5. Login as Business

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"business@example.com","password":"password"}'
```

### 6. Get Business Projects List

```bash
curl http://localhost:8000/api/business/projects \
  -H "Authorization: Bearer <BUSINESS_TOKEN>"
```

Expected: Empty `data` array (no projects created yet, but endpoint responds 200 OK).

## Idempotency

The `DemoSeeder` is idempotent. Running it multiple times will NOT create duplicate records:

```bash
php artisan db:seed --class=DemoSeeder
php artisan db:seed --class=DemoSeeder  # Safe to run again
```

## Troubleshooting

### "Table not found" errors

Run migrations first:

```bash
php artisan migrate
```

### "Duplicate entry" errors

This should not happen with `DemoSeeder` (uses `firstOrCreate`/`updateOrCreate`). 
If it does, check for manual data insertions with conflicting unique keys.

### "Class DemoSeeder not found"

Regenerate autoload:

```bash
composer dump-autoload
```

## Next Steps

After bootstrap:

1. Open browser to `http://localhost:8000`
2. Login with any demo account
3. Students can view roadmap and submit tasks
4. Business users can create projects
5. Admin can manage content and users
