from fastapi.testclient import TestClient
import importlib.util, pathlib, sys
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(here))
spec = importlib.util.spec_from_file_location('evaluator_main', str(here / 'main.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
app = mod.app
client = TestClient(app)
from evaluator import config
config.settings.AI_ENABLED = False
resp = client.post('/evaluate', files={'file': ('sample.txt', b'hello','text/plain')}, data={'project_description':'demo','student_run_status':'I ran it'})
print('status:', resp.status_code)
# write body to a file for reliable inspection
open('debug_resp.txt','wb').write(resp.content)
print('wrote debug_resp.txt')
