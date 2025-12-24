import requests
import os
url = 'http://127.0.0.1:8001/evaluate'
body = {
  'repo_url': 'https://github.com/example/repo',
  'answer_text': 'test',
  'student_run_status': 'npm install; npm run dev',
  'task_title': 't',
  'task_description': 'd'
}
try:
    r = requests.post(url, json=body, timeout=10)
    print('STATUS', r.status_code)
    print(r.text)
except Exception as e:
    print('ERROR', e)
