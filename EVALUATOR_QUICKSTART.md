# Quick Start: AI Project Evaluator

## 5-Minute Setup

### Step 1: Get OpenAI API Key

- Go to https://platform.openai.com/api-keys
- Create an API key
- Copy the key (starts with `sk_`)

### Step 2: Configure Evaluator

```bash
# Edit the .env file
cd backend/services/project-evaluator
# Edit .env and paste your API key:
OPENAI_API_KEY=sk_your_key_here
OPENAI_MODEL=gpt-4o
EVALUATOR_PORT=8001
```

### Step 3: Setup Python Environment

```bash
cd backend/services/project-evaluator
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Step 4: Run Everything

**Option A (Recommended):**

```bash
cd backend
composer dev
```

**Option B (Separate windows):**

Terminal 1:

```bash
cd backend
php artisan serve
```

Terminal 2:

```bash
cd backend
php artisan queue:work
```

Terminal 3:

```bash
cd backend/services/project-evaluator
venv\Scripts\activate
python main.py
```

Terminal 4:

```bash
cd frontend
npm run dev
```

### Step 5: Test It

1. Go to `http://localhost:5173`
2. Login as a student
3. Navigate to a task
4. Click "Submit Task"
5. Fill in the form
6. Click "Submit"
7. Wait for "Evaluating..." message
8. See results in 10-30 seconds

## What Gets Evaluated

The AI evaluator analyzes:

**Functionality (0-70 points)**

- Does the code likely run?
- Does it meet requirements?
- Error handling quality
- Evidence from student's statement

**Code Quality (0-30 points)**

- Readability and formatting
- Design and structure
- Proper use of language features
- Algorithm correctness

**Total: 0-100 points**

- ✅ 80+ = PASSED
- ⚠️ <80 = Needs improvement

## Files You Need to Know About

```
backend/
├── services/
│   └── project-evaluator/      # Python FastAPI evaluator
│       ├── main.py
│       ├── .env
│       └── requirements.txt
├── app/
│   ├── Jobs/
│   │   └── EvaluateSubmissionJob.php  # Async evaluation job
│   └── Modules/
│       └── AI/
│           └── Application/
│               └── Services/
│                   └── TaskEvaluationService.php  # Calls Python service
└── .env                        # Has EVALUATOR_URL

frontend/
└── src/
    └── pages/
        └── student/
            └── StudentTaskSubmitPage.tsx  # Shows feedback
```

## Verify It's Working

```bash
# Check evaluator is running
curl http://127.0.0.1:8001/health

# Should return:
# {"status": "ok"}
```

## Next Steps

- [ ] Add custom evaluation criteria per task
- [ ] Configure point multipliers for difficulty levels
- [ ] Set up email notifications when evaluation completes
- [ ] Create admin dashboard to monitor evaluations
- [ ] Integrate with portfolio for passing submissions

## Need Help?

See `EVALUATOR_SETUP.md` for detailed documentation and troubleshooting.
