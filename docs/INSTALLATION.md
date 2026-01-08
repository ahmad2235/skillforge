# Installation Guide

> Complete setup instructions for SkillForge development environment

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Backend Setup (Laravel)](#backend-setup-laravel)
- [Frontend Setup (React)](#frontend-setup-react)
- [Database Setup](#database-setup)
- [AI Services Setup](#ai-services-setup)
- [Chat Server Setup](#chat-server-setup)
- [Environment Variables](#environment-variables)
- [Docker Setup (Optional)](#docker-setup-optional)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software   | Version | Purpose                    |
|------------|---------|----------------------------|
| PHP        | 8.2+    | Laravel backend runtime    |
| Composer   | 2.x     | PHP dependency manager     |
| Node.js    | 18+     | Frontend & chat server     |
| npm        | 9+      | Node package manager       |
| MySQL      | 8.0+    | Primary database           |
| Python     | 3.10+   | AI microservices           |

### Optional Software

- Docker & Docker Compose (for containerized deployment)
- Redis (for queue and caching)
- PostgreSQL (alternative to MySQL)

---

## Backend Setup (Laravel)

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install PHP Dependencies

```bash
composer install
```

### 3. Environment Configuration

```bash
cp .env.example .env
php artisan key:generate
```

### 4. Database Migration

```bash
php artisan migrate
php artisan db:seed  # Optional: seed sample data
```

### 5. Storage Link

```bash
php artisan storage:link
```

### 6. Start Development Server

```bash
php artisan serve
# Server runs at http://localhost:8000
```

### Using Composer Scripts

```bash
composer setup   # Install deps, migrate, seed
composer dev     # Start server + queue + logs
composer test    # Run PHPUnit tests
```

---

## Frontend Setup (React)

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env
# Update VITE_API_URL to point to backend
```

### 4. Start Development Server

```bash
npm run dev
# Frontend runs at http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

---

## Database Setup

### MySQL Configuration

1. Create a new database:

```sql
CREATE DATABASE skillforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'skillforge'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON skillforge.* TO 'skillforge'@'localhost';
FLUSH PRIVILEGES;
```

2. Update `.env` in backend:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillforge
DB_USERNAME=skillforge
DB_PASSWORD=your_password
```

### PostgreSQL Configuration (Alternative)

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=skillforge
DB_USERNAME=skillforge
DB_PASSWORD=your_password
```

### Running Migrations

```bash
cd backend
php artisan migrate
php artisan migrate:fresh --seed  # Reset and seed
```

---

## AI Services Setup

### Project Evaluator (FastAPI)

```bash
cd backend/services/project-evaluator
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Cosine Recommender (FastAPI)

```bash
cd recommender/skillforge-cosine-recommender
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

### PDF Project Leveler (FastAPI)

```bash
cd project_leveler
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```

---

## Chat Server Setup

### Socket.IO Server (Node.js)

```bash
cd backend/services/chat-server
npm install
npm start  # Runs on port 3001
```

### Environment Variables for Chat

```env
# In backend .env
CHAT_SERVER_URL=http://localhost:3001
```

---

## Environment Variables

### Backend (.env)

```env
# Application
APP_NAME=SkillForge
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillforge
DB_USERNAME=root
DB_PASSWORD=

# Authentication
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# Frontend
FRONTEND_URL=http://localhost:5173

# AI Services
EVALUATOR_SERVICE_URL=http://localhost:8001
RECOMMENDER_SERVICE_URL=http://localhost:8002
LEVELER_SERVICE_URL=http://localhost:8003

# Mail (for development)
MAIL_MAILER=log

# Queue
QUEUE_CONNECTION=database
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api
VITE_CHAT_URL=http://localhost:3001
```

> See [CONFIGURATION.md](CONFIGURATION.md) for all configuration options.

---

## Docker Setup (Optional)

### Using Docker Compose

```bash
# From project root
docker-compose -f docker-compose.services.yml up -d
```

### Services Included

- MySQL 8.0
- Redis (optional)
- PHP-FPM
- Nginx
- Node.js (chat server)

<!-- Placeholder: Add docker-compose example -->

---

## Troubleshooting

### Common Issues

#### Permission Denied (Storage)

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### Class Not Found

```bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

#### CORS Errors

Ensure `FRONTEND_URL` in `.env` matches your frontend URL.

#### Database Connection Refused

- Check MySQL service is running
- Verify credentials in `.env`
- Ensure database exists

#### Node Modules Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### OS-Specific Notes

#### Windows

- Use Git Bash or WSL for Unix-like commands
- Replace `source venv/bin/activate` with `venv\Scripts\activate`

#### macOS

- Install dependencies via Homebrew: `brew install php composer node mysql`

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install php8.2 php8.2-mysql composer nodejs npm mysql-server
```

---

## Next Steps

- Review [USAGE.md](USAGE.md) for workflow examples
- Read [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoint details
- Check [TESTING.md](TESTING.md) to run tests

---

**Last Updated**: January 2026
