import json
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from typing import Optional, Any, Dict

# Modern OpenAI SDK (v1.0+)
try:
    from openai import OpenAI
    from openai import (
        AuthenticationError,
        RateLimitError,
        APIConnectionError,
        APIError,
        APITimeoutError,
    )
except Exception as e:  # pragma: no cover
    OpenAI = None
    AuthenticationError = RateLimitError = APIConnectionError = APIError = APITimeoutError = Exception

from evaluator.config import settings

logger = logging.getLogger("project_evaluator.openai_client")


class OpenAIError(Exception):
    def __init__(self, reason: str, message: str = "", original: Optional[Exception] = None, details: Optional[Dict] = None):
        super().__init__(message or reason)
        self.reason = reason
        self.original = original
        self.details = details or {}


def map_exception_to_reason(exc: Exception) -> str:
    if isinstance(exc, OpenAIError):
        return exc.reason
    if isinstance(exc, AuthenticationError):
        return "auth_invalid"
    if isinstance(exc, RateLimitError):
        return "rate_limited"
    if isinstance(exc, APITimeoutError) or isinstance(exc, FutureTimeoutError) or isinstance(exc, TimeoutError):
        return "timeout"
    if isinstance(exc, APIConnectionError):
        return "provider_connection_error"
    if isinstance(exc, APIError):
        return "provider_error"
    return "unknown_error"


class OpenAIClient:
    """Lightweight wrapper around the OpenAI SDK using modern API.

    Provides call_model(prompt, model, timeout) -> str and validate().
    """

    def __init__(self, api_key: str):
        if not api_key:
            raise OpenAIError("missing_key", "Missing OPENAI_API_KEY")
        if OpenAI is None:
            raise OpenAIError("sdk_missing", "OpenAI SDK not available")
        # Do NOT store or log the key
        self.client = OpenAI(api_key=api_key)

    def validate(self, model: str, timeout: int = 10) -> bool:
        try:
            # tiny ping prompt requesting JSON to avoid parse errors
            _ = self.call_model('Return JSON: {"ping": "pong"}', model=model, timeout=timeout)
            return True
        except OpenAIError as e:
            # If the provider returned non-JSON for the ping (parse_error), treat the provider as available
            # for health checks but log a warning. Real evaluation requests will still surface parse_error.
            if getattr(e, "reason", None) == "parse_error":
                logger.warning("OpenAI ping returned non-JSON (parse_error); treating as available for health checks", exc_info=e)
                return True
            raise OpenAIError(map_exception_to_reason(e), str(e), original=e)
        except Exception as e:
            raise OpenAIError(map_exception_to_reason(e), str(e), original=e)

    def call_model(self, prompt: str, model: Optional[str], timeout: int = 25) -> str:
        # Ensure model fallback
        if not model:
            model = settings.OPENAI_MODEL or "gpt-4o-mini"

        # Enforce timeout using ThreadPool
        try:
            with ThreadPoolExecutor(max_workers=1) as ex:
                future = ex.submit(self._do_responses_call, prompt, model)
                resp = future.result(timeout=timeout)

            # Extract textual output from Responses API
            content = self._extract_text_from_response(resp)

            # If no content, retry once before giving up
            if not content:
                logger.warning("OpenAI returned no content on first attempt; retrying once...")
                with ThreadPoolExecutor(max_workers=1) as ex:
                    future = ex.submit(self._do_responses_call, prompt, model)
                    resp = future.result(timeout=timeout)
                content = self._extract_text_from_response(resp)

            # If still no content after retry, return safe fallback JSON instead of raising
            if not content:
                logger.warning("OpenAI returned no content after retry; returning safe fallback JSON")
                fallback = {
                    "total_score": 0,
                    "passed": False,
                    "summary": "AI evaluation failed: provider returned no content.",
                    "provider_malformed": True
                }
                return json.dumps(fallback)

            # The client expects the model to return JSON text. Do a quick validity check here and raise parse_error if not JSON.
            try:
                json.loads(content)
                return content
            except Exception:
                # Prepare diagnostic meta
                meta = {}
                # status code/content-type/raw preview extraction
                status_code = None
                content_type = None
                raw_preview = None
                try:
                    # Try common attributes
                    status_code = getattr(resp, "status", None) or getattr(resp, "status_code", None)
                except Exception:
                    status_code = None
                try:
                    headers = getattr(resp, "headers", None) or (getattr(resp, "_response", None) and getattr(resp._response, "headers", None))
                    if headers:
                        content_type = headers.get("content-type") or headers.get("Content-Type")
                except Exception:
                    content_type = None
                try:
                    # Attempt to serialize response to a string preview
                    raw = None
                    if hasattr(resp, "to_dict"):
                        raw = json.dumps(resp.to_dict())
                    else:
                        raw = str(resp)
                    raw_preview = (raw[:500]) if raw else (content[:500])
                except Exception:
                    raw_preview = (content[:500]) if content else None

                meta = {"raw_preview": raw_preview, "content_type": content_type, "status_code": status_code}

                # Log the parse failing info (no secrets)
                logger.warning("Failed to parse provider JSON response; status=%s content_type=%s raw_preview=%s", status_code, content_type, raw_preview)

                # Raise a structured parse_error so callers can return 502 with details
                raise OpenAIError("parse_error", "Failed to parse provider JSON response", details=meta)

        except FutureTimeoutError as e:
            raise OpenAIError("timeout", "OpenAI request timed out", original=e)
        except AuthenticationError as e:
            raise OpenAIError("auth_invalid", "Authentication failed", original=e)
        except RateLimitError as e:
            raise OpenAIError("rate_limited", "Rate limited by OpenAI", original=e)
        except APIConnectionError as e:
            raise OpenAIError("provider_connection_error", "Connection error to provider", original=e)
        except APIError as e:
            raise OpenAIError("provider_error", "Provider API error", original=e)
        except OpenAIError:
            raise
        except Exception as e:
            raise OpenAIError("provider_error", "Unexpected provider error", original=e)

    def _do_responses_call(self, prompt: str, model: str) -> Any:
        # Use the Responses API to get structured output
        try:
            # Prefer max_output_tokens; fallback to max_tokens if not supported
            try:
                return self.client.responses.create(model=model, input=prompt, temperature=0, max_output_tokens=1000)
            except Exception as e:
                if "max_output_tokens" in str(e) or "max_tokens" in str(e):
                    return self.client.responses.create(model=model, input=prompt, temperature=0, max_tokens=1000)
                raise
        except Exception:
            raise

    def _extract_text_from_response(self, resp: Any) -> Optional[str]:
        # First, try the convenient property
        try:
            if hasattr(resp, "output_text") and resp.output_text:
                return str(resp.output_text)
        except Exception:
            pass

        # Next, try to assemble from output items
        try:
            parts = []
            # If it's dict-like
            if isinstance(resp, dict):
                out = resp.get("output") or resp.get("choices") or []
                for item in out:
                    # content may be list of dicts
                    content = item.get("content") if isinstance(item, dict) else None
                    if isinstance(content, list):
                        for c in content:
                            if isinstance(c, dict) and c.get("type") == "output_text":
                                parts.append(c.get("text") or c.get("content") or "")
                            elif isinstance(c, str):
                                parts.append(c)
                    elif isinstance(content, str):
                        parts.append(content)
                if parts:
                    return "\n".join(parts)

            # If it's an SDK object with 'output'
            out = getattr(resp, "output", None)
            if out:
                for item in out:
                    # item may have 'content'
                    content = getattr(item, "get", None) and item.get("content") or getattr(item, "content", None)
                    if isinstance(content, list):
                        for c in content:
                            if isinstance(c, dict):
                                # dict-like content
                                parts.append(c.get("text") or c.get("content") or "")
                            else:
                                parts.append(str(c))
                    else:
                        if isinstance(content, str):
                            parts.append(content)
                if parts:
                    return "\n".join(parts)

        except Exception:
            pass

        # Last resort: stringify
        try:
            return str(resp)
        except Exception:
            return None

