from fastapi.testclient import TestClient
import importlib.util, pathlib, sys
here = pathlib.Path(__file__).resolve().parent.parent / "main.py"
sys.path.insert(0, str(here.parent))
spec = importlib.util.spec_from_file_location("evaluator_main", str(here))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
app = getattr(mod, "app")
print('Routes:')
for r in app.routes:
    print(r.path)
client = TestClient(app)
resp = client.get('/health')
print('/health status:', resp.status_code)
print('/health body:', resp.text)
