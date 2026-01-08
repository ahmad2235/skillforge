# PDF Project Difficulty Evaluator (FastAPI)

A small FastAPI service that:
- accepts a **PDF** containing a project description,
- extracts text + **PDF page count**,
- sends a **strict** prompt to OpenAI,
- returns JSON that can be consumed by your SkillForge recommender.

## Output fields (aligned with SkillForge)
This API returns these key fields that match your recommender dataset schema:
- `domain`: `backend | frontend | fullstack`
- `required_level`: `beginner | intermediate | advanced`
- `complexity`: `low | medium | high`

It also returns supporting fields:
- `language_or_framework`: inferred likely stack
- `estimates`: rough UI pages/screens + DB tables + DB size category
- `reasons`: short explanations

## Run locally

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
# set OPENAI_API_KEY in .env
uvicorn main:app --reload --port 8001
```

Health:
- GET `http://127.0.0.1:8001/health`

Evaluate:
- POST `http://127.0.0.1:8001/evaluate-pdf`
  - form-data key: `file` (the PDF)

Example curl:

```bash
curl -X POST "http://127.0.0.1:8001/evaluate-pdf" \
  -F "file=@/path/to/project_description.pdf"
```

## Notes
- If the PDF is scanned images with no embedded text, extraction may fail. In that case you need OCR before sending, or add OCR to the service.
- `MAX_CHARS` limits prompt size.
