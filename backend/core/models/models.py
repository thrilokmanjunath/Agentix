from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from core.repositories.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Enterprise Two-Factor Authentication (TOTP)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret_encrypted = Column(String, nullable=True)
    two_factor_confirmed_at = Column(DateTime, nullable=True)

    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    workflow_runs = relationship("WorkflowRun", back_populates="owner", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="owner", cascade="all, delete-orphan")
    recovery_codes = relationship("TwoFactorRecoveryCode", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class TwoFactorRecoveryCode(Base):
    __tablename__ = "two_factor_recovery_codes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recovery_codes")

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    session_token_hash = Column(String, unique=True, index=True, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    device_type = Column(String, nullable=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")

class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    llm_provider = Column(String, default="ollama")
    openai_api_key = Column(String, nullable=True)
    theme = Column(String, default="dark")
    
    owner = relationship("User", back_populates="settings")

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    filepath = Column(String, nullable=False)
    rows = Column(Integer, default=0)
    columns = Column(Integer, default=0)
    size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Pipeline intermediate state, persisted here so it survives a backend
    # restart. Previously held only in an in-process dict (DataService),
    # which meant an on-demand recomputation (e.g. /profile) for an already
    # fully-processed dataset would fail with a 400 after any restart, even
    # though the pipeline was marked completed in the database.
    parquet_path = Column(String, nullable=True)
    target_column = Column(String, nullable=True)
    problem_type = Column(String, nullable=True)
    y_test_json = Column(Text, nullable=True)
    y_pred_json = Column(Text, nullable=True)

    owner = relationship("User", back_populates="datasets")

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=True)
    status = Column(String, default="running") # running, completed, failed
    execution_time = Column(Float, default=0.0)
    logs = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="workflow_runs")
    stages = relationship("PipelineStage", back_populates="run", cascade="all, delete-orphan", order_by="PipelineStage.step_order")

class PipelineStage(Base):
    __tablename__ = "pipeline_stages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("workflow_runs.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    step_order = Column(Integer, nullable=False)
    status = Column(String, default="pending") # pending, started, running, completed, failed
    execution_time = Column(Float, default=0.0)
    memory_usage_mb = Column(Float, default=0.0)
    output_data = Column(Text, nullable=True) # JSON
    errors = Column(Text, nullable=True) # JSON
    warnings = Column(Text, nullable=True) # JSON
    recommendations = Column(Text, nullable=True) # JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    run = relationship("WorkflowRun", back_populates="stages")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, default="New Conversation")
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(String, default="default", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False) # 'user' or 'agent'
    content = Column(Text, nullable=False)
    model = Column(String, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    tokens = Column(Integer, nullable=True)
    cached = Column(Boolean, default=False)
    guardrail_status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
