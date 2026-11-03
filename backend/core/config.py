from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agentix API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    JWT_SECRET_KEY: Optional[str] = None
    JWT_SECRET: Optional[str] = None

    # AI & Inference Layer Configuration
    AI_PROVIDER: str = "ollama"  # "ollama", "lm_studio", "openai", "gemini", "anthropic"
    AI_INFERENCE_MODE: str = "local"  # "local", "cloud", "auto"
    AI_ALLOW_CLOUD_FALLBACK: bool = False
    AI_REQUEST_TIMEOUT: int = 120

    # Local Inference Endpoints
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: Optional[str] = None
    LM_STUDIO_BASE_URL: str = "http://127.0.0.1:1234/v1"
    LM_STUDIO_MODEL: Optional[str] = None

    # Optional Cloud API Integrations (Server-side only)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"

    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
