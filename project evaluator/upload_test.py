import sys
import pathlib
import importlib.util
from fastapi.testclient import TestClient

# Import app module
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here))
spec = importlib.util.spec_from_file_location("evaluator_main", str(here / "main.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
app = getattr(mod, "app")


def test_upload_file_multipart(tmp_path):
    # Create a temporary sample file
    sample = tmp_path / "sample.txt"
    sample.write_text("hello sample")

    client = TestClient(app)

    # Force AI disabled fallback
    from evaluator import config
    config.settings.AI_ENABLED = False

    files = {"file": ("sample.txt", sample.read_bytes(), "text/plain")}
    data = {"project_description": "demo", "student_run_status": "I ran it"}

    r = client.post("/evaluate", files=files, data=data)
    assert r.status_code == 503, f"status={r.status_code} body={r.text}"
    j = r.json()
    assert j.get("success") is False
    assert (j.get("error") or {}).get("reason") == "ai_disabled"

