import os
import json
import io
import zipfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.1")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set in .env")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="Project Evaluator")

# Allow calls from your frontend later (React, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # later you can restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """
You are an expert senior engineer and code reviewer.

Your job:
- Evaluate a software project and its programmer using the given source code, project description, and the student's own statement about whether it runs.
- You do NOT execute the code yourself. Your judgment is based on static analysis of the code and the student's report.
- Be direct, precise, and strictly professional.
- Do NOT be friendly, casual, or overly positive.
- Do NOT apologize.
- If there are mistakes or problems, state them clearly and factually.

Scoring rules:
- functional_score: 0–70
  - This is an estimate of how well the project likely runs and satisfies the requirements.
  - Use:
    - The student's run-status statement and any description of tests they ran.
    - The code structure and completeness (obvious missing parts, syntax issues, unimplemented sections).
    - Evidence of input validation, error handling, and correct behavior.
  - If there is no reliable evidence that it runs, be conservative with this score and explain why.
- code_quality_score: 0–30
  - Focus on:
    - Cleanliness: readability, naming, comments, formatting.
    - Design quality: structure, modularity, separation of concerns, use of language features.
    - Solution quality: correctness of approach, algorithmic soundness, appropriateness of data structures.
    - Performance considerations where relevant.
- total_score = functional_score + code_quality_score (0–100).
- passed = true if total_score >= 80, otherwise false.
- If passed is true, congrats_message must be a short, neutral sentence like:
  - "You passed the evaluation."
  Do not add extra praise or enthusiasm.
- If passed is false, congrats_message must be an empty string.

You MUST return ONLY valid JSON with this exact structure and no extra text:

{
  "functional_score": 0,
  "code_quality_score": 0,
  "total_score": 0,
  "passed": false,
  "congrats_message": "",
  "project_assessment": {
    "estimated_runs": "yes | no | partially | unclear",
    "estimated_runs_comment": "",
    "execution_evidence_quality": "strong | medium | weak | none",
    "requirements_coverage": {
      "score": 0,
      "comment": ""
    },
    "robustness": {
      "score": 0,
      "comment": ""
    },
    "testing": {
      "score": 0,
      "comment": ""
    }
  },
  "code_assessment": {
    "cleanliness": {
      "score": 0,
      "comment": ""
    },
    "design_quality": {
      "score": 0,
      "comment": ""
    },
    "solution_quality": {
      "score": 0,
      "comment": ""
    },
    "performance_considerations": {
      "score": 0,
      "comment": ""
    }
  },
  "developer_assessment": {
    "estimated_level": "junior | mid | senior | unclear",
    "strengths": [],
    "weaknesses": [],
    "improvement_suggestions": []
  },
  "summary": ""
}

All numeric scores must be integers between 0 and 100, respecting:
- functional_score in [0, 70]
- code_quality_score in [0, 30]
- total_score = functional_score + code_quality_score

The estimated_runs and execution_evidence_quality fields must match the evidence you see:
- Use "yes" only if the code looks complete and the student reports successful execution.
- Use "no" if the code is clearly incomplete or the student states it does not run.
- Use "partially" if only some parts work or tests are partially failing.
- Use "unclear" if there is not enough information.
- For execution_evidence_quality:
  - "strong": detailed test results, clear description of successful runs.
  - "medium": some evidence but not fully convincing.
  - "weak": vague claims without detail.
  - "none": no meaningful execution information.

You must be consistent: the scores and comments must not contradict each other.
"""


async def extract_text_from_file(upload: UploadFile) -> str:
    """
        If the user uploads a zip file, read all text/source files inside it.
        This represents a whole project folder (backend, frontend, DB, etc.).
        Otherwise, just read the single file as text.
        """
    raw = await upload.read()
    filename = (upload.filename or "").lower()

    if filename.endswith(".zip"):
        text_parts = []
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue

                inner_name = info.filename
                lower_name = inner_name.lower()


                if any(part in lower_name for part in [
                    "node_modules/",
                    "node_modules\\",
                    "/.git/",
                    "\\.git\\",
                    "/dist/",
                    "\\dist\\",
                    "/build/",
                    "\\build\\",
                    "/venv/",
                    "\\venv\\",
                    "/.venv/",
                    "\\.venv\\",
                ]):
                    continue

                if not lower_name.endswith((
                        ".py", ".js", ".jsx", ".ts", ".tsx",
                        ".java", ".kt", ".cs", ".cpp", ".cc", ".c", ".h", ".hpp",
                        ".php", ".rb", ".go", ".rs",
                        ".html", ".css", ".scss",
                        ".sql", ".prisma",
                        ".json", ".yml", ".yaml", ".toml", ".ini",
                        ".txt", ".md",
                )):
                    continue

                try:
                    with zf.open(info) as f:
                        content = f.read().decode("utf-8", errors="ignore")
                        if content.strip():
                            text_parts.append(
                                f"\n--- FILE: {inner_name} ---\n{content}\n"
                            )
                except Exception:
                    continue

        return "\n".join(text_parts).strip()

    try:
        return raw.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def call_model(user_content: str) -> dict:
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )

    text = response.output[0].content[0].text
    return json.loads(text)


@app.post("/evaluate")
async def evaluate_project(
    file: UploadFile = File(...),
    project_description: str = Form(""),
    student_language: str = Form(""),
    student_run_status: str = Form(""),
    known_issues: str = Form(""),
):
    try:
        project_text = await extract_text_from_file(file)

        if not project_text.strip():
            raise ValueError("Could not read any text from the uploaded file.")

        user_content = f"""
Project description:
{project_description or "N/A"}

Student language / tech stack:
{student_language or "N/A"}

Student run-status statement:
{student_run_status or "N/A"}

Known issues reported by student:
{known_issues or "N/A"}

Project files (text extracted from the uploaded file):
{project_text}
"""

        data = call_model(user_content)

        return {"success": True, "data": data}

    except Exception as e:
        print("Error during evaluation:", repr(e))
        raise HTTPException(status_code=500, detail="Evaluation failed.")
