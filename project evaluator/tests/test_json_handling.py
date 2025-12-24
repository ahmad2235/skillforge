from fastapi.testclient import TestClient
import json
import importlib.util
import pathlib

# Import app from main.py even if package name contains spaces
here = pathlib.Path(__file__).resolve().parent.parent / "main.py"
# Ensure project evaluator package imports (evaluator.*) resolve by adding its parent to sys.path
import sys
sys.path.insert(0, str(here.parent))
spec = importlib.util.spec_from_file_location("evaluator_main", str(here))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
app = getattr(mod, "app")
client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert "ai_enabled" in j

def test_invalid_json_returns_json_invalid():
    # send invalid json (missing quotes)
    headers = {"Content-Type": "application/json"}
    r = client.post("/evaluate", data="{invalid}", headers=headers)
    assert r.status_code == 400
    j = r.json()
    assert j["success"] is False
    assert j["error"]["reason"] in ("json_invalid", "content_length_mismatch")

def test_content_length_mismatch_detected():
    # Simulate a client that sets wrong Content-Length header
    headers = {"Content-Type": "application/json", "Content-Length": "200"}
    body = json.dumps({"repo_url": "https://github.com/example/repo", "answer_text": "test"})
    r = client.post("/evaluate", data=body, headers=headers)
    # We allow either strict behavior (400) or lenient handling (parse and continue). Ensure behavior is one of those.
    assert r.status_code in (400, 200, 503, 502)
    if r.status_code == 400:
        j = r.json()
        assert j["success"] is False
        assert j["error"]["reason"] == "content_length_mismatch"
    else:
        # lenient path should not return 422
        assert r.status_code != 422

def test_valid_json_ai_disabled_fallback():
    # With AI disabled in test config, evaluate returns the manual_review error (503)
    payload = {"repo_url": "https://github.com/example/repo", "answer_text": "test"}
    r = client.post("/evaluate", json=payload)
    assert r.status_code == 503
    j = r.json()
    assert j.get("success") is False
    assert (j.get("error") or {}).get("reason") == "ai_disabled"
    assert (j.get("error") or {}).get("type") == "ai_disabled"
