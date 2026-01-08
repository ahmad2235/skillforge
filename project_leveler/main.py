import os
import json
import io
import logging
from typing import Any, Dict, Tuple

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pypdf import PdfReader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")  # Updated to more common model

if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY is not set!")
    raise RuntimeError("OPENAI_API_KEY is not set in environment")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(
    title="SkillForge PDF Project Difficulty Evaluator",
    description="Analyzes PDF project descriptions and extracts domain, level, complexity",
    version="1.0.0",
)

# Allow calls from Laravel backend and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = r"""
You are an expert senior software architect.

Task:
Given a project description (from a PDF), produce:
1) required_level: how hard the project is for a student ("beginner" | "intermediate" | "advanced")
2) complexity: overall complexity ("low" | "medium" | "high")
3) title: a concise project title (4-10 words)
4) description: a crisp 1-3 sentence summary suitable for a project brief
5) milestones: 3-6 concrete milestones ordered from first to last delivery step

You MUST base your classification primarily on:
- likely database size and modeling complexity (number of entities/tables, relations, roles, workflows)
- number of application screens/pages/features implied (auth, admin panels, dashboards, CRUD breadth, multi-tenant, etc.)
- integrations (payments, maps, email/SMS, external APIs, realtime, ML, etc.)
- non-functional requirements (security, performance, scaling, offline, concurrency)

You must also infer:
- domain: "backend" | "frontend" | "fullstack"
- language_or_framework: an array of likely languages/frameworks needed (examples: ["Laravel", "React"], ["FastAPI", "PostgreSQL"], ["Flutter"], etc.)
- estimates: rough numeric estimates for UI pages/screens and DB tables
- milestones: each with a deliverable title and brief description; provide due_in_weeks (int) when possible
- short reasons: 1-3 sentences each, direct and factual

Style rules:
- Be strict and professional.
- No friendliness, no fluff, no encouragement.
- No apologies.
- Keep reasons short.

Output rules:
You MUST return ONLY valid JSON with this exact structure and no extra text:

{
    "domain": "backend | frontend | fullstack",
    "required_level": "beginner | intermediate | advanced",
    "complexity": "low | medium | high",
    "title": "",
    "description": "",
    "language_or_framework": [],
    "estimates": {
        "pdf_pages": 0,
        "ui_pages": { "min": 0, "max": 0 },
        "db_tables": { "min": 0, "max": 0 },
        "db_size": "small | medium | large"
    },
    "reasons": {
        "required_level": "",
        "complexity": "",
        "language_or_framework": ""
    },
    "milestones": [
        {
            "title": "",
            "description": "",
            "due_in_weeks": 0,
            "is_required": true
        }
    ]
}

Constraints:
- title: 4-10 words, no emojis, no quotes.
- description: 1-3 sentences, <= 400 characters, no emojis.
- pdf_pages must be the provided integer.
- ui_pages and db_tables must be non-negative integers with min <= max.
- db_size must match your db_tables estimate:
    - small: 1-8 tables
    - medium: 9-20 tables
    - large: 21+ tables
- milestones: 3-6 items, ordered, titles 3-12 words, descriptions <= 200 chars, due_in_weeks >= 0 (0 if unknown), is_required must be true/false.
- If the description is ambiguous, choose the more conservative (lower) classification and explain briefly.
"""

MAX_CHARS = int(os.getenv("MAX_CHARS", "180000"))


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Tuple[str, int]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = len(reader.pages)
    parts = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        text = text.strip()
        if text:
            parts.append(f"\n--- PDF PAGE {i} ---\n{text}\n")
    full_text = "\n".join(parts).strip()
    if len(full_text) > MAX_CHARS:
        full_text = full_text[:MAX_CHARS] + "\n[TRUNCATED]\n"
    return full_text, pages


def call_model(user_content: str) -> Dict[str, Any]:
    """Call OpenAI API to analyze the project description."""
    try:
        # Use chat completions API (more widely available)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},  # Ensure JSON response
            temperature=0.3,  # Lower temperature for more consistent output
        )
        text = response.choices[0].message.content
        logger.info(f"OpenAI response received, length: {len(text)}")
        return json.loads(text.strip())
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response as JSON: {e}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON response")
    except Exception as e:
        logger.error(f"OpenAI API error: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@app.get("/health")
def health():
    """Health check endpoint for container orchestration."""
    return {"status": "ok", "service": "project_leveler"}


@app.post("/evaluate-pdf")
async def evaluate_pdf(file: UploadFile = File(...)):
    """
    Analyze a PDF project description and extract classification data.
    
    Returns:
        - domain: backend | frontend | fullstack
        - required_level: beginner | intermediate | advanced
        - complexity: low | medium | high
        - language_or_framework: suggested tech stack
        - estimates: UI pages, DB tables estimates
        - reasons: explanations for classifications
    """
    try:
        filename = (file.filename or "").lower()
        if not filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only .pdf files are supported.")

        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file.")
        
        logger.info(f"Processing PDF: {file.filename}, size: {len(raw)} bytes")

        pdf_text, page_count = extract_text_from_pdf_bytes(raw)
        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract readable text from the PDF.")

        logger.info(f"Extracted {page_count} pages, {len(pdf_text)} characters")

        user_content = f"""PDF pages: {page_count}

Project description (text extracted from the PDF):
{pdf_text}
"""

        data = call_model(user_content)
        
        # Inject actual PDF page count
        if "estimates" in data:
            data["estimates"]["pdf_pages"] = page_count
        
        logger.info(f"Analysis complete: domain={data.get('domain')}, level={data.get('required_level')}, complexity={data.get('complexity')}")
        
        return {"success": True, "data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during evaluation: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
