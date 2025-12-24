import json
from fastapi.testclient import TestClient

# Import the app from main
from main import app


def test_evaluate_returns_error_when_ai_disabled(monkeypatch):
    # Ensure app behaves as if AI is disabled/unavailable
    app.state.openai_client = None

    client = TestClient(app)

    payload = {
        "repo_url": "https://github.com/user/repo",
        "answer_text": "Solution",
        "student_run_status": "Yes",
        "task_title": "Task",
        "task_description": "Desc",
        "known_issues": "None",
    }

    resp = client.post("/evaluate", json=payload)
    assert resp.status_code in (200, 503)  # Depending on deployment we might still return 200 with error
    data = resp.json()
    # Must not look like a success payload
    assert data.get("success") is False
    err = data.get("error") or {}
    assert err.get("reason") == "ai_disabled"
    assert "Manual review" in (err.get("message") or "")
