# Project Evaluator Service

FastAPI service that evaluates student projects using OpenAI GPT-4.

## Setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create `.env` file with:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o
EVALUATOR_PORT=8001
```

## Running

```bash
python main.py
```

The service will start on `http://127.0.0.1:8001`.

### Health Check

```bash
curl http://127.0.0.1:8001/health
```

### Evaluate a Project

Submit a project file (single file or zip archive) for evaluation:

```bash
curl -X POST http://127.0.0.1:8001/evaluate \
  -F "file=@project.zip" \
  -F "project_description=Build a TODO app" \
  -F "student_language=React + TypeScript" \
  -F "student_run_status=Yes, it runs" \
  -F "known_issues=None"
```

Response:

```json
{
  "success": true,
  "data": {
    "functional_score": 65,
    "code_quality_score": 25,
    "total_score": 90,
    "passed": true,
    "congrats_message": "You passed the evaluation.",
    "project_assessment": {...},
    "code_assessment": {...},
    "developer_assessment": {...},
    "summary": "..."
  }
}
```

## Integration with SkillForge

The Laravel backend calls this service asynchronously when:

1. A student submits a task/project
2. The backend sends the submission for evaluation
3. Results are stored and displayed to the student

See `app/Modules/AI/Application/Services/TaskEvaluationService.php` for Laravel integration.
