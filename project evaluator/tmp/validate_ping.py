from evaluator.openai_client import OpenAIClient, OpenAIError
from evaluator.config import settings

print('AI_ENABLED=', settings.AI_ENABLED)
print('OPENAI_API_KEY present=', bool(settings.OPENAI_API_KEY))
try:
    c = OpenAIClient(api_key=settings.OPENAI_API_KEY)
    ok = c.validate(model=settings.OPENAI_MODEL, timeout=5)
    print('validate returned', ok)
except OpenAIError as e:
    print('OpenAIError:', e.reason, str(e))
except Exception as e:
    print('Exception:', e)
