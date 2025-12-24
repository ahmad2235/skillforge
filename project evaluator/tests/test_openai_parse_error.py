import importlib.util
import pathlib
import sys
from fastapi.testclient import TestClient
import pytest

here = pathlib.Path(__file__).resolve().parent.parent / "main.py"
sys.path.insert(0, str(here.parent))
spec = importlib.util.spec_from_file_location("evaluator_main", str(here))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
app = getattr(mod, "app")
from evaluator.openai_client import OpenAIClient, OpenAIError

client = TestClient(app)

class DummyResp:
    def __init__(self, text):
        self.output_text = text
        self.headers = {"content-type": "text/plain"}
        self.status = 200
    def to_dict(self):
        return {"output_text": self.output_text}

def test_parse_error_returned_for_non_json(monkeypatch):
    # Patch the low-level responses call to return non-JSON text
    def fake_do_responses_call(self, prompt, model):
        return DummyResp("This is not JSON output from model.")

    # Ensure AI is enabled and there is a client on app.state
    import evaluator.config as config
    monkeypatch.setattr(config.settings, "AI_ENABLED", True)
    monkeypatch.setattr(config.settings, "OPENAI_API_KEY", "dummykey")

    class FakeClient:
        def call_model(self, *args, **kwargs):
            raise OpenAIError("parse_error", "Failed to parse provider JSON response", details={"raw_preview": "This is not JSON output.", "content_type": "text/plain", "status_code": 200})

    app.state.openai_client = FakeClient()

    payload = {"repo_url": "https://github.com/example/repo", "answer_text": "test"}
    r = client.post("/evaluate", json=payload)
    assert r.status_code == 502
    j = r.json()
    assert j["success"] is False
    err = j["error"]
    assert err["type"] == "provider_error"
    assert err["reason"] == "parse_error"
    details = err.get("details") or {}
    assert "raw_preview" in details
    assert "content_type" in details
    assert "status_code" in details
