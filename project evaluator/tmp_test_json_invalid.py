from fastapi.testclient import TestClient
import main as app_module
client = TestClient(app_module.app)
r = client.post('/evaluate', data='not-a-json', headers={'content-type':'application/json'})
print('STATUS', r.status_code)
print(r.text)
