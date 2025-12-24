"""Smoke test for OpenAI configuration.

Run: python -m evaluator.smoke_test

Prints SUCCESS or FAILURE with reason/latency.
"""
import time
import sys
from evaluator.config import settings
from evaluator.openai_client import OpenAIClient, OpenAIError


def main():
    if not settings.AI_ENABLED:
        print("AI disabled by configuration. Nothing to test.")
        sys.exit(0)

    if not settings.OPENAI_API_KEY:
        print("FAILURE: missing_key. Set OPENAI_API_KEY in .env")
        sys.exit(1)

    client = OpenAIClient(api_key=settings.OPENAI_API_KEY)
    try:
        start = time.time()
        client.validate(model=settings.OPENAI_MODEL, timeout=settings.OPENAI_TIMEOUT_SECONDS)
        latency = time.time() - start
        print(f"SUCCESS: model={settings.OPENAI_MODEL} latency={latency:.2f}s")
        sys.exit(0)
    except OpenAIError as e:
        print(f"FAILURE: reason={e.reason} message={str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"FAILURE: unexpected: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
