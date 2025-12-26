from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    AI_ENABLED: bool = True
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-5.1"
    OPENAI_TIMEOUT_SECONDS: int = 25
    OPENAI_MAX_RETRIES: int = 1

    # Evaluator runtime overrides (optional)
    EVALUATOR_URL: str = "http://127.0.0.1:8001"
    EVALUATOR_TIMEOUT: int = 300
    EVALUATOR_CONNECT_TIMEOUT: int = 5
    EVALUATOR_HEALTH_TIMEOUT: int = 3

    class Config:
        env_file = ".env"


# Instantiate default settings
settings = Settings()
