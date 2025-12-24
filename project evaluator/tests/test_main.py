import json
import os
import asyncio
import sys
import pathlib
import pytest
from fastapi.testclient import TestClient

# Add project evaluator to path
here = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(here))

import main as app_module
from evaluator import openai_client, config


@pytest.fixture(autouse=True)
def restore_settings():
    # Save original settings
    orig_ai = config.settings.AI_ENABLED
    orig_key = config.settings.OPENAI_API_KEY
    orig_model = config.settings.OPENAI_MODEL
    yield
    # Restore
    config.settings.AI_ENABLED = orig_ai
    config.settings.OPENAI_API_KEY = orig_key
    config.settings.OPENAI_MODEL = orig_model


def test_ai_disabled_returns_fallback_manual_review():
    config.settings.AI_ENABLED = False
    # Ensure app state reflects disabled AI (startup may not be re-run in test harness)
    app_module.app.state.ai_enabled = False
    app_module.app.state.last_error = 'ai_disabled'

    client = TestClient(app_module.app)

    # Health should report ai_disabled as last_error when AI is disabled
    h = client.get("/health").json()
    assert h["ai_enabled"] is False
    assert h["last_error"] == 'ai_disabled'

    resp = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert resp.status_code == 503
    body = resp.json()
    assert body.get("success") is False
    assert (body.get("error") or {}).get("reason") == "ai_disabled"
    assert (body.get("error") or {}).get("type") == "ai_disabled"


def test_missing_key_returns_fallback_manual_review_and_health_shows_missing_key():
    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = None
    # Ensure app state reflects AI enabled but missing key
    app_module.app.state.ai_enabled = True
    app_module.app.state.last_error = 'missing_key'

    client = TestClient(app_module.app)

    # health should show ai_enabled True and last_error missing_key
    h = client.get("/health").json()
    assert h["ai_enabled"] is True
    # last_error may be set during startup
    assert h["last_error"] in ("missing_key", None)

    r = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert r.status_code == 503
    body = r.json()
    assert body.get("success") is False
    assert (body.get("error") or {}).get("reason") == "ai_disabled"
    assert (body.get("error") or {}).get("type") == "ai_disabled"


def test_invalid_key_returns_auth_invalid(monkeypatch):
    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = "invalid"

    # Create a fake client and set it on app.state
    class FakeClient:
        def call_model(self, prompt, model, timeout):
            raise openai_client.OpenAIError("auth_invalid", "Authentication failed")

    app_module.app.state.openai_client = FakeClient()

    client = TestClient(app_module.app)
    r = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert r.status_code == 502
    body = r.json()
    assert body["success"] is False
    assert body["error"]["reason"] == "auth_invalid"


def test_invalid_json_returns_json_invalid():
    client = TestClient(app_module.app)
    r = client.post("/evaluate", data="not-a-json", headers={"content-type": "application/json"})
    assert r.status_code == 400
    body = r.json()
    assert body["success"] is False
    assert body["error"]["reason"] == "json_invalid"


def test_student_run_status_does_not_execute(monkeypatch):
    # Ensure subprocess.run is not called when student_run_status contains commands
    called = {"run": False}

    def fake_run(*args, **kwargs):
        called["run"] = True
        raise RuntimeError("No execution allowed")

    import subprocess
    monkeypatch.setattr(subprocess, "run", fake_run)

    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = None  # force fallback

    client = TestClient(app_module.app)
    r = client.post("/evaluate", json={"repo_url": "https://github.com/example/repo", "student_run_status": "npm i && npm run dev"})
    assert r.status_code == 503
    body = r.json()
    assert body.get("success") is False
    # ensure subprocess.run not called
    assert called["run"] is False


def test_successful_evaluation_returns_succeeded(monkeypatch):
    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = "valid"

    # Create a fake client and set it on app.state
    class FakeClient:
        def call_model(self, prompt, model, timeout):
            return json.dumps({"total_score": 85, "passed": True, "summary": "Nice work"})

    app_module.app.state.openai_client = FakeClient()

    client = TestClient(app_module.app)
    r = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["total_score"] == 85
    assert data["passed"] is True
    assert data["summary"] == "Nice work"
    assert data["ai_disabled"] is False


def test_embedded_json_in_text_is_parsed(monkeypatch):
    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = "valid"

    class FakeClient:
        def call_model(self, prompt, model, timeout):
            # Model returns explanation text that contains a JSON snippet somewhere inside
            return "Here is my analysis:\n\n{\"total_score\": 70, \"passed\": false, \"summary\": \"Rough but informative\"}\n\nNotes: end"

    app_module.app.state.openai_client = FakeClient()

    client = TestClient(app_module.app)
    r = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["total_score"] == 70
    assert body["data"]["summary"] == "Rough but informative"


def test_embedded_json_in_backticks_is_parsed(monkeypatch):
    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = "valid"

    class FakeClient:
        def call_model(self, prompt, model, timeout):
            return "Notes:\n```json\n{\"total_score\": 42, \"passed\": false, \"summary\": \"Found it\"}\n```\nEnd"

    app_module.app.state.openai_client = FakeClient()

    client = TestClient(app_module.app)
    r = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["total_score"] == 42
    assert body["data"]["summary"] == "Found it"


def test_content_length_mismatch_allows_valid_json():
    # Simulate a client that sends a wrong Content-Length header but valid JSON body
    client = TestClient(app_module.app)
    headers = {"content-type": "application/json", "content-length": "9999"}
    r = client.post("/evaluate", content=b"{\"repo_url\": \"https://github.com/owner/repo\"}", headers=headers)
    # Should accept and parse the body (not return 400)
    assert r.status_code in (200, 503, 502)
    # If AI is disabled in this test harness it may return 503; primary check is we didn't get 400/422
    assert r.status_code != 400
    assert r.status_code != 422


def test_admin_revalidate_requires_token(monkeypatch):
    # Ensure endpoint is protected when token is not set
    import os
    monkeypatch.delenv("EVALUATOR_ADMIN_TOKEN", raising=False)
    client = TestClient(app_module.app)
    r = client.post("/admin/revalidate")
    assert r.status_code == 403


def test_admin_revalidate_runs_when_token_present(monkeypatch):
    monkeypatch.setenv("EVALUATOR_ADMIN_TOKEN", "testtoken")
    client = TestClient(app_module.app)
    r = client.post("/admin/revalidate", headers={"X-Admin-Token": "testtoken"})
    assert r.status_code == 200
    body = r.json()
    assert body.get("success") in (True, False)  # success True if validate succeeded, False only if validation failed but endpoint executed
    assert "last_error" in body



def test_rescue_attempt_on_parse_error(monkeypatch):
    config.settings.AI_ENABLED = True
    config.settings.OPENAI_API_KEY = "valid"

    class FakeClient:
        calls = 0
        def call_model(self, prompt, model, timeout):
            # First call returns non-JSON explanatory text; second call returns strict JSON
            FakeClient.calls += 1
            if FakeClient.calls == 1:
                return "Here is my analysis but I forgot to return JSON. Sorry."
            return json.dumps({"total_score": 60, "passed": True, "summary": "Rescued"})

    app_module.app.state.openai_client = FakeClient()

    client = TestClient(app_module.app)
    r = client.post("/evaluate", json={"repo_url": "https://github.com/owner/repo"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["total_score"] == 60
    assert body["data"]["summary"] == "Rescued"
