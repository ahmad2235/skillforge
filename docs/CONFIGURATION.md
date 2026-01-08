# Configuration Guide

> Environment variables, configuration files, and deployment settings for SkillForge

---

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Laravel Configuration](#laravel-configuration)
- [Frontend Configuration](#frontend-configuration)
- [AI Services Configuration](#ai-services-configuration)
- [Docker Configuration](#docker-configuration)
- [Production Settings](#production-settings)

---

## Overview

SkillForge uses environment-based configuration across all services:

| Service         | Config File    | Environment File |
|-----------------|----------------|------------------|
| Backend         | `config/*.php` | `backend/.env`   |
| Frontend        | `vite.config.ts` | `frontend/.env` |
| Chat Server     | `config.js`    | `services/chat-server/.env` |
| AI Services     | `config.py`    | Service-specific `.env` |

---

## Environment Variables

### Backend (.env)

#### Application Settings

```env
# Application
APP_NAME=SkillForge
APP_ENV=local                    # local, staging, production
APP_KEY=                         # Generated via php artisan key:generate
APP_DEBUG=true                   # Set false in production
APP_URL=http://localhost:8000

# Timezone
APP_TIMEZONE=UTC
```

#### Database

```env
# Database Connection
DB_CONNECTION=mysql              # mysql, pgsql, sqlite
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillforge
DB_USERNAME=root
DB_PASSWORD=secret

# Database Pool (production)
DB_POOL_MIN=2
DB_POOL_MAX=10
```

#### Authentication

```env
# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
SESSION_DOMAIN=localhost

# Token Settings
TOKEN_EXPIRATION_DAYS=7
```

#### Frontend & CORS

```env
# Frontend URL (for CORS and emails)
FRONTEND_URL=http://localhost:5173

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
CORS_ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With
```

#### AI Services

```env
# Project Evaluator
EVALUATOR_SERVICE_URL=http://localhost:8001
EVALUATOR_TIMEOUT=30
EVALUATOR_RETRY_ATTEMPTS=3

# Recommendation Service
RECOMMENDER_SERVICE_URL=http://localhost:8002
RECOMMENDER_TIMEOUT=15

# Project Leveler
LEVELER_SERVICE_URL=http://localhost:8003
LEVELER_TIMEOUT=60
```

#### Chat Server

```env
# Socket.IO Chat Server
CHAT_SERVER_URL=http://localhost:3001
CHAT_SERVER_SECRET=your-secret-key
```

#### Mail

```env
# Mail Driver
MAIL_MAILER=smtp                 # smtp, log, mailgun, ses
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@skillforge.app
MAIL_FROM_NAME="${APP_NAME}"
```

#### Queue

```env
# Queue Connection
QUEUE_CONNECTION=database        # sync, database, redis, sqs

# Redis (if using redis queue)
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

#### Cache

```env
# Cache Driver
CACHE_DRIVER=file                # file, redis, memcached, database
CACHE_PREFIX=skillforge_cache
```

#### Session

```env
# Session Driver
SESSION_DRIVER=file              # file, cookie, database, redis
SESSION_LIFETIME=120
```

#### Logging

```env
# Logging
LOG_CHANNEL=stack                # single, daily, stack, syslog
LOG_LEVEL=debug                  # debug, info, notice, warning, error
LOG_DEPRECATIONS_CHANNEL=null
```

#### File Storage

```env
# Filesystem
FILESYSTEM_DISK=local            # local, s3, public

# AWS S3 (if using S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=skillforge-uploads
AWS_USE_PATH_STYLE_ENDPOINT=false
```

---

### Frontend (.env)

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000

# Chat Server
VITE_CHAT_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_CHAT=true
VITE_ENABLE_AI_FEEDBACK=true

# Analytics (optional)
VITE_GA_TRACKING_ID=
VITE_SENTRY_DSN=

# Environment
VITE_APP_ENV=development
```

---

### Chat Server (.env)

```env
# Server
PORT=3001
HOST=0.0.0.0

# Laravel API
LARAVEL_API_URL=http://localhost:8000/api
SANCTUM_VALIDATION_ENDPOINT=/auth/user

# Database (optional, for direct access)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillforge
DB_USERNAME=root
DB_PASSWORD=secret

# Redis (for scaling)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

---

### AI Services (.env)

#### Project Evaluator

```env
# Server
HOST=0.0.0.0
PORT=8001

# Execution
MAX_EXECUTION_TIME=30
SANDBOX_MEMORY_LIMIT=256M

# Models (if using ML)
MODEL_PATH=/models/evaluator
OPENAI_API_KEY=                  # Optional, for GPT-based evaluation
```

#### Recommender Service

```env
# Server
HOST=0.0.0.0
PORT=8002

# Algorithm
SIMILARITY_THRESHOLD=0.5
MAX_RECOMMENDATIONS=10

# Database
DATABASE_URL=mysql://user:pass@localhost/skillforge
```

#### Project Leveler

```env
# Server
HOST=0.0.0.0
PORT=8003

# PDF Processing
MAX_FILE_SIZE=10485760           # 10MB
TEMP_DIR=/tmp/leveler
```

---

## Laravel Configuration

### Key Configuration Files

```
backend/config/
├── app.php          # Application settings
├── auth.php         # Authentication guards
├── cors.php         # CORS settings
├── database.php     # Database connections
├── filesystems.php  # Storage disks
├── logging.php      # Log channels
├── mail.php         # Mail drivers
├── queue.php        # Queue connections
├── sanctum.php      # Sanctum settings
└── services.php     # Third-party services
```

### CORS Configuration

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

### Rate Limiting

```php
// app/Providers/RouteServiceProvider.php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('auth', function (Request $request) {
    return Limit::perMinute(5)->by($request->input('email') . $request->ip());
});
```

### Queue Configuration

```php
// config/queue.php
'connections' => [
    'database' => [
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'default',
        'retry_after' => 90,
        'after_commit' => false,
    ],
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => false,
    ],
],
```

---

## Frontend Configuration

### Vite Configuration

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### TypeScript Configuration

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

---

## Docker Configuration

### docker-compose.services.yml

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: skillforge_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-secret}
      MYSQL_DATABASE: ${DB_DATABASE:-skillforge}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - skillforge

  # Redis (Cache & Queue)
  redis:
    image: redis:alpine
    container_name: skillforge_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - skillforge

  # Laravel Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: skillforge_backend
    restart: unless-stopped
    depends_on:
      - mysql
      - redis
    environment:
      - APP_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/var/www/html
      - ./backend/storage:/var/www/html/storage
    networks:
      - skillforge

  # Chat Server
  chat:
    build:
      context: ./backend/services/chat-server
      dockerfile: Dockerfile
    container_name: skillforge_chat
    restart: unless-stopped
    depends_on:
      - redis
      - backend
    environment:
      - LARAVEL_API_URL=http://backend:8000/api
      - REDIS_URL=redis://redis:6379
    ports:
      - "3001:3001"
    networks:
      - skillforge

  # Project Evaluator
  evaluator:
    build:
      context: ./backend/services/project-evaluator
      dockerfile: Dockerfile
    container_name: skillforge_evaluator
    restart: unless-stopped
    ports:
      - "8001:8001"
    networks:
      - skillforge

  # Recommender Service
  recommender:
    build:
      context: ./recommender/skillforge-cosine-recommender
      dockerfile: Dockerfile
    container_name: skillforge_recommender
    restart: unless-stopped
    environment:
      - DATABASE_URL=mysql://root:${DB_PASSWORD:-secret}@mysql/${DB_DATABASE:-skillforge}
    ports:
      - "8002:8002"
    networks:
      - skillforge

volumes:
  mysql_data:
  redis_data:

networks:
  skillforge:
    driver: bridge
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM php:8.2-fpm

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /var/www/html/storage

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
```

---

## Production Settings

### Environment Checklist

```env
# PRODUCTION .env

APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.skillforge.app

# Security
APP_KEY=base64:...                    # Keep secret!
BCRYPT_ROUNDS=12

# Database
DB_CONNECTION=mysql
DB_HOST=your-db-host.rds.amazonaws.com
DB_DATABASE=skillforge_prod
DB_USERNAME=skillforge_prod
DB_PASSWORD=strong-password-here

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PASSWORD=redis-password

# Mail
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=noreply@skillforge.app

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error

# Frontend
FRONTEND_URL=https://skillforge.app

# AI Services
EVALUATOR_SERVICE_URL=https://evaluator.skillforge.app
RECOMMENDER_SERVICE_URL=https://recommender.skillforge.app
```

### Performance Optimization

```bash
# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev
```

### Security Headers

Configured via `SecurityHeadersMiddleware`:

```php
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
$response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
$response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
```

### SSL/HTTPS

Force HTTPS in production:

```php
// app/Providers/AppServiceProvider.php
public function boot()
{
    if (app()->environment('production')) {
        URL::forceScheme('https');
    }
}
```

---

## Configuration Reference

### Required Environment Variables

| Variable              | Required In | Description                    |
|-----------------------|-------------|--------------------------------|
| APP_KEY               | All         | Application encryption key     |
| DB_DATABASE           | All         | Database name                  |
| DB_USERNAME           | All         | Database user                  |
| DB_PASSWORD           | All         | Database password              |
| FRONTEND_URL          | All         | Frontend application URL       |
| EVALUATOR_SERVICE_URL | Production  | AI evaluator service URL       |

### Optional Environment Variables

| Variable              | Default     | Description                    |
|-----------------------|-------------|--------------------------------|
| APP_DEBUG             | false       | Debug mode                     |
| LOG_LEVEL             | error       | Minimum log level              |
| QUEUE_CONNECTION      | sync        | Queue driver                   |
| CACHE_DRIVER          | file        | Cache driver                   |

---

**Last Updated**: January 2026
