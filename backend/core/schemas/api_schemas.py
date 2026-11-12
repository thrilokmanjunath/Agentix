from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class DatasetRequest(BaseModel):
    dataset_name: str

class PredictRequest(BaseModel):
    dataset_name: str
    target_column: Optional[str] = None

class AutoMLRunRequest(BaseModel):
    dataset_name: str
    target_column: Optional[str] = None
    task_type: Optional[str] = None
    selected_algorithms: Optional[List[str]] = None
    max_candidates: Optional[int] = 5

class ChatRequest(BaseModel):
    query: str
    dataset_name: Optional[str] = None
    context_keys: Optional[List[str]] = []
    conversation_id: Optional[str] = None
    tenant_id: Optional[str] = "default"
    model: Optional[str] = None
    provider: Optional[str] = None


class AIConfigUpdateRequest(BaseModel):
    ai_provider: Optional[str] = None
    active_model: Optional[str] = None
    inference_mode: Optional[str] = None
    allow_cloud_fallback: Optional[bool] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    lm_studio_base_url: Optional[str] = None
    lm_studio_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_model: Optional[str] = None


class AIModelDiscoveryRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    force_refresh: bool = True

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    tenant_id: Optional[str] = "default"

class ConversationRenameRequest(BaseModel):
    title: str

class BaseResponse(BaseModel):
    status: str
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None

