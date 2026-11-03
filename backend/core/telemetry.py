import os
import sys
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

logger = logging.getLogger("agentix_v2")

class NoOpSpanExporter:
    """Silent exporter when telemetry is completely disabled, unreachable, or running tests."""
    def export(self, spans):
        return
    def shutdown(self):
        return

def setup_telemetry(app):
    """
    Initializes telemetry with a graceful fallback hierarchy:
    1. OTLPSpanExporter (Production/Staging if OTEL_ENDPOINT is set)
    2. ConsoleSpanExporter (Development)
    3. NoOpSpanExporter (Fallback if disabled, unreachable, or in test mode)
    """
    telemetry_enabled = os.getenv("TELEMETRY_ENABLED", "true").lower() == "true"
    is_testing = "PYTEST_CURRENT_TEST" in os.environ or os.getenv("TESTING") == "true" or "pytest" in sys.modules
    env = os.getenv("ENVIRONMENT", "development")
    otel_endpoint = os.getenv("OTEL_TRACES_EXPORTER_ENDPOINT", "http://otel-collector:4317")
    
    resource = Resource(attributes={SERVICE_NAME: "agentix-backend"})
    trace_provider = TracerProvider(resource=resource)
    
    if not telemetry_enabled or is_testing:
        processor = BatchSpanProcessor(NoOpSpanExporter())
        logger.info("Telemetry disabled or running in test mode. Using NoOp exporter.")
    else:
        try:
            if env == "production" or os.getenv("FORCE_OTLP") == "true":
                exporter = OTLPSpanExporter(endpoint=otel_endpoint, insecure=True)
                logger.info(f"Using OTLPSpanExporter at {otel_endpoint}")
            else:
                exporter = ConsoleSpanExporter()
                logger.info("Using ConsoleSpanExporter for development.")
                
            processor = BatchSpanProcessor(exporter)
        except Exception as e:
            logger.warning(f"Failed to initialize primary telemetry exporter: {str(e)}. Falling back to NoOp.")
            processor = BatchSpanProcessor(NoOpSpanExporter())
            
    trace_provider.add_span_processor(processor)
    trace.set_tracer_provider(trace_provider)
    FastAPIInstrumentor.instrument_app(app)


# ---------------------------------------------------------------------------
# GenAI OpenTelemetry Semantic Conventions (Layer 8)
# ---------------------------------------------------------------------------

def get_genai_tracer():
    return trace.get_tracer("agentix.genai")


class GenAISpanContext:
    """Context manager recording OpenTelemetry spans conforming to GenAI Semantic Conventions."""

    def __init__(
        self,
        model: str,
        prompt_template_id: str = "default",
        tenant_id: str = "default",
        user_id: str = "anonymous",
    ):
        self.model = model
        self.prompt_template_id = prompt_template_id
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.tracer = get_genai_tracer()
        self.span = None

    def __enter__(self):
        self.span = self.tracer.start_span("gen_ai.inference")
        self.span.set_attribute("gen_ai.system", "ollama")
        self.span.set_attribute("gen_ai.request.model", self.model)
        self.span.set_attribute("gen_ai.prompt.template_id", self.prompt_template_id)
        self.span.set_attribute("tenant.id", self.tenant_id)
        self.span.set_attribute("user.id", self.user_id)
        return self

    def record_usage(self, prompt_tokens: int, completion_tokens: int, finish_reason: str = "stop"):
        if self.span:
            self.span.set_attribute("gen_ai.usage.prompt_tokens", prompt_tokens)
            self.span.set_attribute("gen_ai.usage.completion_tokens", completion_tokens)
            self.span.set_attribute("gen_ai.response.finish_reasons", [finish_reason])

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span:
            if exc_type:
                self.span.set_attribute("error", True)
                self.span.set_attribute("error.message", str(exc_val))
            self.span.end()

