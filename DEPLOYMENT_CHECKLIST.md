# Deployment Checklist: AI Project Evaluator

## Pre-Deployment Verification

### ✅ Backend Setup

- [ ] All migrations run: `php artisan migrate --force`
- [ ] Queue connection configured: `QUEUE_CONNECTION=database`
- [ ] Routes registered: `php artisan route:list | grep submission`
- [ ] Services config loaded: `php artisan config:clear && php artisan config:cache`

### ✅ Python Environment

- [ ] Evaluator venv created: `python -m venv venv`
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file exists with `OPENAI_API_KEY`
- [ ] Model set correctly: `OPENAI_MODEL=gpt-4o`

### ✅ API Keys

- [ ] OpenAI API key valid and active
- [ ] API key not committed to git
- [ ] `.env` files in `.gitignore`

### ✅ Testing

- [ ] Backend server runs: `php artisan serve`
- [ ] Queue worker processes: `php artisan queue:work --tries=1`
- [ ] Python evaluator starts: `python main.py`
- [ ] Frontend builds: `npm run build`

### ✅ Database

- [ ] `submissions` table has `ai_score`, `ai_feedback`, `ai_metadata`, `is_evaluated`
- [ ] All foreign keys intact
- [ ] No orphaned submissions

### ✅ Frontend

- [ ] `StudentTaskSubmitPage.tsx` updated with polling
- [ ] New fields rendered (run_status, known_issues)
- [ ] Evaluation results panel displays correctly
- [ ] No TypeScript errors: `npm run lint`

---

## Deployment Steps

### Step 1: Database

```bash
cd backend

# Backup current database first
# (commands depend on your DB engine)

# Run migrations
php artisan migrate --force

# Verify
php artisan migrate:status
```

### Step 2: Environment

```bash
# Copy production .env settings
cp .env.prod .env

# Essential vars:
# - EVALUATOR_URL=http://127.0.0.1:8001  (or your evaluator host)
# - QUEUE_CONNECTION=database
# - DATABASE_URL=(your prod DB)
# - OPENAI_API_KEY=(secret key)

# Generate cache
php artisan config:cache
php artisan route:cache
```

### Step 3: Python Service

```bash
cd backend/services/project-evaluator

# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Test
python -c "from fastapi import FastAPI; print('FastAPI OK')"

# Verify OpenAI
python -c "from openai import OpenAI; print('OpenAI OK')"
```

### Step 4: Start Services

```bash
# Use supervisor or systemd to manage these:

# Service 1: Laravel API
php artisan serve --host=0.0.0.0 --port=8000

# Service 2: Queue Worker (critical!)
php artisan queue:work --tries=1 --daemon

# Service 3: Python Evaluator
python main.py  # Or use gunicorn for production

# Service 4: Frontend (if hosting separately)
npm run build  # Then serve dist/ folder
```

### Step 5: Monitoring

```bash
# Check queue is processing
php artisan queue:work --verbose

# Monitor evaluator
curl http://evaluator-host:8001/health

# Check logs
tail -f storage/logs/laravel.log
```

---

## Production Configuration

### Supervisor (Laravel Queue)

**File:** `/etc/supervisor/conf.d/skillforge-queue.conf`

```ini
[program:skillforge-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/skillforge/backend/artisan queue:work --tries=1 --daemon
autostart=true
autorestart=true
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/skillforge/queue.log
```

Start:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start skillforge-queue:*
```

### Systemd (Python Evaluator)

**File:** `/etc/systemd/system/skillforge-evaluator.service`

```ini
[Unit]
Description=SkillForge AI Project Evaluator
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/skillforge/backend/services/project-evaluator
ExecStart=/var/www/skillforge/backend/services/project-evaluator/venv/bin/python main.py
Restart=on-failure
RestartSec=5
EnvironmentFile=/var/www/skillforge/backend/services/project-evaluator/.env

[Install]
WantedBy=multi-user.target
```

Start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable skillforge-evaluator
sudo systemctl start skillforge-evaluator
sudo systemctl status skillforge-evaluator
```

### Nginx (Frontend Proxy)

**File:** `/etc/nginx/sites-available/skillforge`

```nginx
upstream laravel {
    server 127.0.0.1:8000;
}

upstream evaluator {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name skillforge.example.com;

    root /var/www/skillforge/frontend/dist;
    index index.html;

    # API routes
    location /api/ {
        proxy_pass http://laravel;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Evaluator (internal only, consider firewall rules)
    location /evaluator/ {
        proxy_pass http://evaluator/;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # React SPA fallback
    location / {
        try_files $uri /index.html;
    }

    # Disable access to sensitive files
    location ~ /\.env {
        deny all;
    }
}
```

Restart:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Scaling Considerations

### For 100+ Concurrent Evaluations

- [ ] Switch to Redis queue: `QUEUE_CONNECTION=redis`
- [ ] Run multiple queue workers:
  ```bash
  supervisor: numprocs=4  # Run 4 queue workers
  ```
- [ ] Consider Celery or RabbitMQ for larger scale
- [ ] Implement rate limiting on API
- [ ] Cache evaluator responses for duplicate submissions

### For Global Deployment

- [ ] Deploy Python evaluator to multiple regions
- [ ] Use load balancer for evaluator endpoints
- [ ] Implement health checks and failover
- [ ] Monitor OpenAI API quota usage
- [ ] Set up CloudFlare or CDN for frontend

---

## Monitoring & Logging

### Health Checks

```bash
# Evaluator health
curl https://skillforge.example.com/api/health

# Queue status
php artisan queue:failed
php artisan queue:work --verbose

# OpenAI quota
python -c "from openai import OpenAI; c = OpenAI(api_key='...'); print('API OK')"
```

### Logging

**Laravel:** `storage/logs/laravel.log`

```php
Log::info("Submission {$id} evaluated: score={$score}");
```

**Python:** Console output (captured by systemd/supervisor)

```python
print(f"Evaluated submission {submission_id}: {score}/100")
```

### Metrics to Track

- [ ] Average evaluation time (target: <30s)
- [ ] Queue depth (should stay <10)
- [ ] Failed evaluations (should be <5%)
- [ ] OpenAI API costs per month
- [ ] Student satisfaction (score distribution)

---

## Rollback Plan

If issues occur:

```bash
# Pause new submissions
# (Disable submit button or return 503 error)

# Check failed jobs
php artisan queue:failed

# Retry failed evaluations
php artisan queue:retry all

# Rollback migration if schema issues
php artisan migrate:rollback --step=1

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Restart services
systemctl restart skillforge-queue
systemctl restart skillforge-evaluator
systemctl restart nginx
```

---

## Testing in Production

### Smoke Test

```bash
# 1. Login as test student
# 2. Submit a simple task
# 3. Wait for evaluation (should be <30s)
# 4. Verify score appears
# 5. Check database: SELECT * FROM submissions WHERE is_evaluated=1 LIMIT 1;
```

### Load Test

```bash
# Test with 10 concurrent submissions
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/student/tasks/1/submit \
    -H "Authorization: Bearer token" \
    -H "Content-Type: application/json" \
    -d '{"answer_text":"test code","run_status":"yes"}' &
done
wait

# Monitor queue:
php artisan queue:work --verbose
```

---

## Post-Deployment

- [ ] Monitor logs for 24 hours
- [ ] Check evaluation success rate (should be >95%)
- [ ] Verify average evaluation time (<30s)
- [ ] Get student feedback on results quality
- [ ] Document any issues and fixes applied
- [ ] Plan iteration based on data

---

## Emergency Contacts

If evaluator service goes down:

1. **Check evaluator service**

   ```bash
   systemctl status skillforge-evaluator
   systemctl logs -f skillforge-evaluator
   ```

2. **Restart evaluator**

   ```bash
   systemctl restart skillforge-evaluator
   ```

3. **Check OpenAI API status**

   - Go to https://status.openai.com/
   - Verify API key has quota

4. **Temporary mitigation**
   - Disable evaluation requirement
   - Accept submissions without scores
   - Queue for manual review

---

## Sign-Off

- [ ] All checklist items verified
- [ ] Backup created
- [ ] Monitoring set up
- [ ] Team notified of deployment
- [ ] Rollback plan in place
- [ ] Deployment approved and dated

**Deployed by:** ******\_\_\_******  
**Date:** ******\_\_\_******  
**Environment:** [ ] Staging [ ] Production
