import os
import json
import asyncio
import logging
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

# Local evaluator helpers
from evaluator.openai_client import OpenAIClient, OpenAIError, map_exception_to_reason
from evaluator.config import settings

# Load environment
load_dotenv()

REQUEST_LOGGER = logging.getLogger("project_evaluator")
logging.basicConfig(level=logging.INFO)

# App-level timeouts coming from settings
app = FastAPI(title="Project Evaluator")

# Allow calls from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application state for health data
app.state.ai_enabled = bool(settings.AI_ENABLED)
app.state.model = settings.OPENAI_MODEL
app.state.provider = "openai"
app.state.last_check_at = None
app.state.last_error = None
app.state.openai_client = None


@app.on_event("startup")
async def startup_event():
    # Keep ai_enabled equal to configured flag (truthful). Do not flip it based on key presence.
    REQUEST_LOGGER.info(f"AI_ENABLED={settings.AI_ENABLED}; model={settings.OPENAI_MODEL}")

    if not settings.AI_ENABLED:
        app.state.last_error = "ai_disabled"
        return

    if not settings.OPENAI_API_KEY:
        # Mark missing_key; still report ai_enabled True per requirement
        app.state.last_error = "missing_key"
        REQUEST_LOGGER.warning("OPENAI_API_KEY missing while AI_ENABLED=true")
        return

    # Try to initialize client and validate with short timeout
    try:
        client = OpenAIClient(api_key=settings.OPENAI_API_KEY)
        client.validate(model=settings.OPENAI_MODEL, timeout=min(10, settings.OPENAI_TIMEOUT_SECONDS))
        app.state.openai_client = client
        app.state.last_check_at = datetime.utcnow().isoformat()
        app.state.last_error = None
        REQUEST_LOGGER.info("OpenAI validation succeeded; client ready")
    except OpenAIError as e:
        app.state.last_error = e.reason
        REQUEST_LOGGER.error("OpenAI validation failed", exc_info=e)
    except Exception as e:
        app.state.last_error = "provider_error"
        REQUEST_LOGGER.error("OpenAI validation unexpected failure", exc_info=e)


@app.get("/health")
async def health():
    """Returns health information including AI provider status (no secrets).

    If we previously recorded a `parse_error`, attempt an on-demand re-validation so health reflects current state
    without requiring a process restart.
    """
    # If parse_error was set, re-validate now to avoid stale health state
    if app.state.last_error == "parse_error":
        try:
            await startup_event()
        except Exception:
            # keep last_error as-is if revalidation fails
            pass

    return {
        "ai_enabled": bool(app.state.ai_enabled),
        "model": app.state.model,
        "provider": app.state.provider,
        "last_check_at": app.state.last_check_at,
        "last_error": app.state.last_error,
    }


@app.post("/admin/revalidate")
async def admin_revalidate(request: Request):
    """Re-run OpenAI client validation and update health state.

    Protected by header X-Admin-Token which must match the EVALUATOR_ADMIN_TOKEN env var.
    When EVALUATOR_ADMIN_TOKEN is not set, this endpoint will be forbidden.
    """
    token = request.headers.get("X-Admin-Token")
    ADMIN_TOKEN = os.getenv("EVALUATOR_ADMIN_TOKEN")
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        return JSONResponse(status_code=403, content={"success": False, "error": {"reason": "forbidden"}})

    # Call startup_event to re-validate client and update app.state
    try:
        await startup_event()
        return JSONResponse(status_code=200, content={"success": True, "last_error": app.state.last_error, "last_check_at": app.state.last_check_at})
    except Exception as e:
        REQUEST_LOGGER.error("/admin/revalidate failed", exc_info=e)
        return JSONResponse(status_code=500, content={"success": False, "error": {"reason": "revalidate_failed", "message": str(e)}})


# Middleware: reject invalid JSON payloads early with structured error
@app.middleware("http")
async def reject_invalid_json(request: Request, call_next):
    ct = request.headers.get("content-type", "")
    cl = request.headers.get("content-length")
    if "application/json" in ct:
        body = await request.body()
        body_len = len(body) if body else 0
        try:
            header_len = int(cl) if cl is not None else None
        except Exception:
            header_len = None

        # Log header vs actual length for diagnostics (do NOT log body contents)
        REQUEST_LOGGER.debug("Incoming JSON request: path=%s content-length_header=%s actual_length=%d", request.url.path, header_len, body_len)

        # If Content-Length header does not match actual body length, log a warning but continue.
        # Historically this returned 400 which caused some PowerShell/transport edge-cases to fail; prefer leniency.
        if header_len is not None and header_len != body_len:
            REQUEST_LOGGER.warning("Content-Length mismatch: header=%s actual=%d — proceeding to parse body", header_len, body_len, extra={"path": request.url.path})

        if body:
            try:
                json.loads(body)
            except Exception:
                REQUEST_LOGGER.warning("Invalid JSON payload detected", extra={"path": request.url.path})
                return JSONResponse(status_code=400, content={"success": False, "error": {"reason": "json_invalid", "message": "Invalid JSON payload"}})
    return await call_next(request)

# Pydantic model for JSON-based evaluation request
class EvaluateRequest(BaseModel):
    repo_url: str  # Required
    answer_text: Optional[str] = ""
    student_run_status: Optional[str] = ""
    task_title: Optional[str] = ""
    task_description: Optional[str] = ""
    known_issues: Optional[str] = ""


from fastapi.responses import JSONResponse


from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Detect JSON decode errors and return json_invalid
    for err in exc.errors():
        # Try to detect JSON parse errors in various shapes
        typ = err.get('type')
        msg = err.get('msg', '')
        if typ == 'value_error.jsondecode' or 'jsondecode' in str(typ or '').lower() or 'json' in str(msg).lower() or 'expecting value' in str(msg).lower():
            # Log header vs actual body length for diagnostics
            body = await request.body()
            cl = request.headers.get('content-length')
            try:
                cl_int = int(cl) if cl else None
            except Exception:
                cl_int = None
            REQUEST_LOGGER.warning("JSON decode error on request %s: content-length header=%s actual_length=%d", request.url.path, cl_int, len(body))
            return JSONResponse(status_code=400, content={"success": False, "error": {"reason": "json_invalid", "message": "Invalid JSON payload"}})
    # Default validation error
    return JSONResponse(status_code=422, content={"success": False, "error": {"reason": "validation_error", "message": "Request validation failed"}})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Convert JSON decode 422 into a structured 400 json_invalid response
    try:
        detail = exc.detail
        if exc.status_code == 422 and (isinstance(detail, str) and 'value_error.jsondecode' in detail or isinstance(detail, dict) and any('value_error.jsondecode' in str(d) for d in (detail.get('errors') or []))):
            # Log header vs body length to aid debugging truncated requests
            body = await request.body()
            cl = request.headers.get('content-length')
            try:
                cl_int = int(cl) if cl else None
            except Exception:
                cl_int = None
            REQUEST_LOGGER.warning("HTTP 422 JSON decode on %s: content-length header=%s actual_length=%d", request.url.path, cl_int, len(body))
            return JSONResponse(status_code=400, content={"success": False, "error": {"reason": "json_invalid", "message": "Invalid JSON payload"}})
    except Exception:
        pass

    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": {"reason": "http_error", "message": str(exc.detail)}})


@app.post("/evaluate")
async def evaluate_project(request: Request):
    """Evaluate a project submission.

    Returns structured JSON with {success, data} on success or {success: False, error} on failures.
    """
    request_id = request.headers.get("X-Request-ID") or request.headers.get("x-request-id")

    # Support legacy multipart/form-data submissions (files + form fields)
    content_type = request.headers.get('content-type', '')
    repo_url = None
    answer_text = ""
    student_run_status = ""
    task_title = ""
    task_description = ""
    known_issues = ""

    if content_type and content_type.startswith('multipart/form-data'):
        form = await request.form()
        # form fields may be UploadFile objects; extract text safely
        repo_url = form.get('repo_url') or None
        answer_text = form.get('answer_text') or ""
        student_run_status = form.get('student_run_status') or ""
        task_title = form.get('task_title') or ""
        task_description = form.get('task_description') or ""
        known_issues = form.get('known_issues') or ""
    else:
        # Expect a JSON body for non-multipart requests
        try:
            body = await request.json()
        except Exception:
            err = {"type": "bad_request", "reason": "json_invalid", "message": "Invalid JSON payload", "details": {}}
            return JSONResponse(status_code=400, content={"success": False, "error": err})

        if not isinstance(body, dict):
            err = {"type": "bad_request", "reason": "invalid_body", "message": "Expected JSON object", "details": {}}
            return JSONResponse(status_code=400, content={"success": False, "error": err})

        repo_url = body.get('repo_url')
        # For JSON body, repo_url is required
        if not repo_url:
            err = {"type": "bad_request", "reason": "missing_repo_url", "message": "repo_url is required for JSON requests", "details": {}}
            return JSONResponse(status_code=422, content={"success": False, "error": err})

        answer_text = body.get('answer_text') or ""
        student_run_status = body.get('student_run_status') or ""
        task_title = body.get('task_title') or ""
        task_description = body.get('task_description') or ""
        known_issues = body.get('known_issues') or ""

    # Sanitize and validate inputs
    import re
    # strip control chars and limit length
    student_run_status = re.sub(r"[\x00-\x1F\x7F]+", " ", student_run_status)
    if len(student_run_status) > 2000:
        student_run_status = student_run_status[:2000]

    if repo_url:
        gh_pattern = re.compile(r"^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$")
        if not gh_pattern.match(repo_url):
            err = {"type": "bad_request", "reason": "invalid_repo_url", "message": "repo_url must be a GitHub repository URL (https://github.com/owner/repo).", "details": {}}
            return JSONResponse(status_code=422, content={"success": False, "error": err})

    # If AI is disabled (config or missing key/unavailable) -> return error for manual review
    if not settings.AI_ENABLED or not settings.OPENAI_API_KEY or app.state.openai_client is None:
        # Return structured error response - NOT success=true with ai_disabled flag
        # This makes it unambiguous to backend that evaluation is not possible
        reason = "ai_disabled"
        err = {"type": "ai_disabled", "reason": reason, "message": "AI evaluation is disabled. Manual review required."}
        REQUEST_LOGGER.warning("/evaluate fallback due to AI disabled/missing client", extra={"request_id": request_id, "reason": reason})
        return JSONResponse(status_code=503, content={"success": False, "error": err})

    # Build prompt
    user_content = f"""
Project/Task Title:
{task_title or 'Task submission'}

Project description:
{task_description or 'Project submission'}

GitHub Repository URL:
{repo_url or 'N/A'}

Student's Answer/Explanation:
{answer_text or 'N/A'}

Student run-status (as provided, DO NOT execute):
{student_run_status or 'N/A'}

Known issues reported by student:
{known_issues or 'N/A'}

Note: Do NOT attempt to execute any student-provided commands.
"""

    client = app.state.openai_client
    # If client was not validated at startup, create a fresh one now (still respecting key)
    if client is None:
        try:
            client = OpenAIClient(api_key=settings.OPENAI_API_KEY)
        except OpenAIError as e:
            reason = e.reason
            err = {"type": "provider_error", "reason": reason, "message": str(e), "details": {}}
            REQUEST_LOGGER.error("/evaluate failed creating client", extra={"request_id": request_id, "reason": reason})
            app.state.last_error = reason
            app.state.last_check_at = datetime.utcnow().isoformat()
            return JSONResponse(status_code=502, content={"success": False, "error": err})

    # Call provider with timeouts
    try:
        result_text = await asyncio.to_thread(client.call_model, f"You are an expert senior engineer.\n{user_content}", settings.OPENAI_MODEL, settings.OPENAI_TIMEOUT_SECONDS)

        # We expect the model to return JSON text
        try:
            parsed = json.loads(result_text)
        except Exception as e:
            # Attempt to extract JSON from common patterns the model may return (code fences, explicit json block, or embedded {...}).
            import re
            parsed = None
            try:
                candidates = []
                # 1) Look for ```json ... ``` fenced code blocks
                m_code_json = re.search(r"```json\s*([\s\S]*?)\s*```", result_text, re.IGNORECASE)
                if m_code_json:
                    candidates.append(m_code_json.group(1))

                # 2) Look for any fenced code block ``` ... ``` and use its content
                m_code_any = re.search(r"```\s*([\s\S]*?)\s*```", result_text)
                if m_code_any:
                    candidates.append(m_code_any.group(1))

                # 3) Try the last {...} block, then the first {...} block
                m_last = re.search(r"\{[\s\S]*\}\s*$", result_text)
                if m_last:
                    candidates.append(m_last.group(0))
                m_first = re.search(r"\{[\s\S]*?\}", result_text)
                if m_first:
                    candidates.append(m_first.group(0))

                # Try parsing candidates in order
                for s in candidates:
                    try:
                        parsed = json.loads(s)
                        REQUEST_LOGGER.warning("/evaluate extracted JSON from provider output (heuristic)", extra={"request_id": request_id})
                        break
                    except Exception:
                        parsed = None
            except Exception:
                parsed = None

            if parsed is None:
                # If the client raised a parse_error OpenAIError, it will be caught in the outer except; here we raise a generic parse error without details
                raise OpenAIError("parse_error", "Failed to parse provider JSON response", original=e)

        # Normalize any legacy ai_disabled indications into a definitive error response
        # Accept various shapes: top-level ai_disabled, nested meta.ai_disabled, reason / outcome markers
        meta = parsed.get('meta') if isinstance(parsed.get('meta'), dict) else (parsed.get('metadata') if isinstance(parsed.get('metadata'), dict) else {})
        parsed_ai_disabled = False
        if parsed.get('ai_disabled') is True:
            parsed_ai_disabled = True
        if meta.get('ai_disabled') is True:
            parsed_ai_disabled = True
        if parsed.get('reason') == 'ai_disabled' or meta.get('reason') == 'ai_disabled':
            parsed_ai_disabled = True
        if parsed.get('outcome') == 'manual_review' or meta.get('evaluation_outcome') == 'manual_review' or parsed.get('evaluation_outcome') == 'manual_review':
            parsed_ai_disabled = True

        if parsed_ai_disabled:
            # Normalize to explicit 503 ai_disabled payload
            err = {
                "type": "ai_disabled",
                "reason": "ai_disabled",
                "message": "AI evaluation is disabled. Manual review required.",
                "details": {}
            }
            REQUEST_LOGGER.warning("/evaluate legacy ai_disabled normalized to error", extra={"request_id": request_id})
            app.state.last_error = 'ai_disabled'
            app.state.last_check_at = datetime.utcnow().isoformat()
            return JSONResponse(status_code=503, content={"success": False, "error": err})

        # Build normalized result for backend
        total_score = parsed.get("total_score") or 0
        try:
            total_score = int(total_score)
        except Exception:
            total_score = 0

        passed = parsed.get("passed", False) or (total_score >= 50)
        summary = parsed.get("summary") or parsed.get("feedback") or "Evaluation completed"
        provider_malformed = parsed.get("provider_malformed", False)

        data = {
            "total_score": total_score,
            "passed": passed,
            "summary": summary,
            "ai_disabled": False
        }

        # Include provider_malformed flag if present
        if provider_malformed:
            data["provider_malformed"] = True

        REQUEST_LOGGER.info("/evaluate success", extra={"request_id": request_id})
        app.state.last_error = None
        app.state.last_check_at = datetime.utcnow().isoformat()
        return JSONResponse(status_code=200, content={"success": True, "data": data})

    except OpenAIError as e:
        reason = e.reason
        msg = str(e)
        details = {}
        # If the error carries structured details (e.g., parse_error), include them
        try:
            details = getattr(e, "details", {}) or {}
        except Exception:
            details = {}

        # If we encountered a parse_error, attempt a rescue call that explicitly asks for strict JSON
        if reason == "parse_error":
            try:
                REQUEST_LOGGER.warning("/evaluate parse_error encountered; attempting rescue call to request strict JSON", extra={"request_id": request_id})
                rescue_prompt = f"Return ONLY a single valid JSON object with keys: total_score (integer), passed (boolean), summary (string), and meta (object). Do not include any extra text or explanation. Here is the submission:\n{user_content}"
                rescue_text = await asyncio.to_thread(client.call_model, f"You are an expert senior engineer.\n{rescue_prompt}", settings.OPENAI_MODEL, settings.OPENAI_TIMEOUT_SECONDS)
                # Try to parse directly first, else attempt embedded extraction
                try:
                    parsed = json.loads(rescue_text)
                except Exception:
                    # Attempt to extract embedded JSON block
                    import re
                    parsed = None
                    try:
                        m = re.search(r"\{[\s\S]*\}", rescue_text)
                        if m:
                            parsed = json.loads(m.group(0))
                            REQUEST_LOGGER.warning("/evaluate extracted JSON from rescue response", extra={"request_id": request_id})
                    except Exception:
                        parsed = None

                if parsed is not None:
                    # Normalize and return same as success path
                    total_score = parsed.get("total_score") or 0
                    try:
                        total_score = int(total_score)
                    except Exception:
                        total_score = 0
                    passed = parsed.get("passed", False) or (total_score >= 50)
                    summary = parsed.get("summary") or parsed.get("feedback") or "Evaluation completed"
                    provider_malformed = parsed.get("provider_malformed", False)
                    data = {"total_score": total_score, "passed": passed, "summary": summary, "ai_disabled": False}
                    if provider_malformed:
                        data["provider_malformed"] = True
                    REQUEST_LOGGER.info("/evaluate success (rescue)", extra={"request_id": request_id})
                    app.state.last_error = None
                    app.state.last_check_at = datetime.utcnow().isoformat()
                    return JSONResponse(status_code=200, content={"success": True, "data": data})
            except Exception as rescue_exc:
                REQUEST_LOGGER.warning("Rescue attempt failed", exc_info=rescue_exc, extra={"request_id": request_id})

        err = {"type": "provider_error", "reason": reason, "message": msg, "details": details}
        REQUEST_LOGGER.error("/evaluate provider error", exc_info=e, extra={"request_id": request_id, "reason": reason, "details": details})
        app.state.last_error = reason
        app.state.last_check_at = datetime.utcnow().isoformat()
        return JSONResponse(status_code=502, content={"success": False, "error": err})

    except Exception as exc:
        reason = map_exception_to_reason(exc)
        err = {"type": "provider_error", "reason": reason, "message": "Unexpected error", "details": {}}
        REQUEST_LOGGER.error("/evaluate unexpected failure", exc_info=exc, extra={"request_id": request_id, "reason": reason})
        app.state.last_error = reason
        app.state.last_check_at = datetime.utcnow().isoformat()
        return JSONResponse(status_code=502, content={"success": False, "error": err})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)

