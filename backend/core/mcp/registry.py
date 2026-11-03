import json
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple


class ToolRiskTier(str, Enum):
    READ_ONLY = "READ_ONLY"      # Non-mutating data queries, profiling, read operations
    MUTATING = "MUTATING"        # Cleans, imputes, transforms datasets
    DESTRUCTIVE = "DESTRUCTIVE"  # Model training, deletion, pipeline abort, data export


@dataclass
class ToolExecutionAudit:
    tool_name: str
    tenant_id: str
    user_id: str
    risk_tier: str
    arguments: Dict[str, Any]
    status: str  # "SUCCESS", "PERMISSION_DENIED", "VALIDATION_FAILED", "EXECUTION_ERROR"
    duration_ms: float
    error_message: Optional[str] = None
    timestamp: float = field(default_factory=time.time)


@dataclass
class MCPTool:
    name: str
    description: str
    input_schema: Dict[str, Any]
    risk_tier: ToolRiskTier
    required_permissions: List[str]
    handler: Callable[..., Any]


def _validate_schema(schema: Dict[str, Any], data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validates data against a standard JSON Schema definition."""
    required = schema.get("required", [])
    for field_name in required:
        if field_name not in data:
            return False, f"Missing required parameter: '{field_name}'"

    properties = schema.get("properties", {})
    type_map = {
        "string": str,
        "integer": int,
        "number": (int, float),
        "boolean": bool,
        "object": dict,
        "array": list,
    }

    for prop_name, prop_spec in properties.items():
        if prop_name in data:
            expected_type = prop_spec.get("type")
            py_type = type_map.get(expected_type)
            if py_type and not isinstance(data[prop_name], py_type):
                return False, f"Parameter '{prop_name}' must be of type '{expected_type}', got {type(data[prop_name]).__name__}"

    return True, None


class MCPRegistry:
    """Model Context Protocol (MCP) tool registry enforcing JSON-RPC schemas,
    parameter validation, role-based tool gating, and audit logging."""

    def __init__(self):
        self._tools: Dict[str, MCPTool] = {}
        self._audit_log: List[ToolExecutionAudit] = []
        self._init_default_tools()

    def _init_default_tools(self):
        # 1. Dataset Profile Tool (READ_ONLY)
        self.register(
            MCPTool(
                name="get_dataset_profile",
                description="Retrieves statistical summary and schema overview for a given dataset.",
                risk_tier=ToolRiskTier.READ_ONLY,
                required_permissions=["DATASET_READ"],
                input_schema={
                    "type": "object",
                    "required": ["dataset_name"],
                    "properties": {
                        "dataset_name": {"type": "string", "description": "The name of the dataset to inspect."}
                    },
                },
                handler=lambda args, **ctx: {
                    "dataset_name": args["dataset_name"],
                    "status": "profile_retrieved",
                    "columns": ["age", "income", "churn"],
                    "row_count": 1000,
                },
            )
        )

        # 2. Model Metrics Tool (READ_ONLY)
        self.register(
            MCPTool(
                name="get_model_metrics",
                description="Retrieves cross-validated performance metrics and evaluation curves for trained models.",
                risk_tier=ToolRiskTier.READ_ONLY,
                required_permissions=["MODEL_EVALUATE"],
                input_schema={
                    "type": "object",
                    "required": ["dataset_name"],
                    "properties": {
                        "dataset_name": {"type": "string", "description": "Target dataset name."},
                        "model_type": {"type": "string", "description": "Optional model filter (e.g. 'xgboost')."}
                    },
                },
                handler=lambda args, **ctx: {
                    "dataset_name": args["dataset_name"],
                    "model_type": args.get("model_type", "best_available"),
                    "accuracy": 0.942,
                    "f1_score": 0.938,
                    "latency_ms": 12.4,
                },
            )
        )

        # 3. Clean Dataset Column (MUTATING)
        self.register(
            MCPTool(
                name="clean_dataset_column",
                description="Applies statistical imputation or normalization to a specified column in the dataset.",
                risk_tier=ToolRiskTier.MUTATING,
                required_permissions=["DATASET_WRITE"],
                input_schema={
                    "type": "object",
                    "required": ["dataset_name", "column_name", "strategy"],
                    "properties": {
                        "dataset_name": {"type": "string", "description": "Target dataset."},
                        "column_name": {"type": "string", "description": "Target column name."},
                        "strategy": {"type": "string", "description": "Imputation strategy ('mean', 'median', 'drop')."}
                    },
                },
                handler=lambda args, **ctx: {
                    "dataset_name": args["dataset_name"],
                    "column_name": args["column_name"],
                    "strategy": args["strategy"],
                    "modified_rows": 42,
                    "status": "imputed",
                },
            )
        )

        # 4. Retrain Model (DESTRUCTIVE)
        self.register(
            MCPTool(
                name="retrain_model",
                description="Initiates full retraining of machine learning models across hardware accelerators.",
                risk_tier=ToolRiskTier.DESTRUCTIVE,
                required_permissions=["MODEL_TRAIN"],
                input_schema={
                    "type": "object",
                    "required": ["dataset_name"],
                    "properties": {
                        "dataset_name": {"type": "string", "description": "Target dataset."},
                        "epochs": {"type": "integer", "description": "Maximum training epochs."}
                    },
                },
                handler=lambda args, **ctx: {
                    "dataset_name": args["dataset_name"],
                    "epochs": args.get("epochs", 50),
                    "status": "training_scheduled",
                },
            )
        )

    def register(self, tool: MCPTool):
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[MCPTool]:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        """Returns tool declarations conforming to the Model Context Protocol (MCP) standard."""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.input_schema,
                "riskTier": tool.risk_tier.value,
                "requiredPermissions": tool.required_permissions,
            }
            for tool in self._tools.values()
        ]

    def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        user_permissions: List[str],
        tenant_id: str = "default",
        user_id: str = "anonymous",
    ) -> Dict[str, Any]:
        """Validates schema, checks permissions, executes the tool, and logs execution audit."""
        start_time = time.time()
        tool = self._tools.get(tool_name)

        if not tool:
            duration = (time.time() - start_time) * 1000
            audit = ToolExecutionAudit(
                tool_name=tool_name,
                tenant_id=tenant_id,
                user_id=user_id,
                risk_tier="UNKNOWN",
                arguments=arguments,
                status="NOT_FOUND",
                duration_ms=duration,
                error_message=f"Tool '{tool_name}' is not registered.",
            )
            self._audit_log.append(audit)
            raise KeyError(f"MCP tool '{tool_name}' not found.")

        # Permission check
        for perm in tool.required_permissions:
            if perm not in user_permissions and "SYSTEM_ADMIN" not in user_permissions:
                duration = (time.time() - start_time) * 1000
                audit = ToolExecutionAudit(
                    tool_name=tool_name,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    risk_tier=tool.risk_tier.value,
                    arguments=arguments,
                    status="PERMISSION_DENIED",
                    duration_ms=duration,
                    error_message=f"Missing required permission: '{perm}'",
                )
                self._audit_log.append(audit)
                raise PermissionError(f"Permission denied: Missing required permission '{perm}' to execute '{tool_name}'.")

        # Schema validation
        valid, error_msg = _validate_schema(tool.input_schema, arguments)
        if not valid:
            duration = (time.time() - start_time) * 1000
            audit = ToolExecutionAudit(
                tool_name=tool_name,
                tenant_id=tenant_id,
                user_id=user_id,
                risk_tier=tool.risk_tier.value,
                arguments=arguments,
                status="VALIDATION_FAILED",
                duration_ms=duration,
                error_message=error_msg,
            )
            self._audit_log.append(audit)
            raise ValueError(f"Schema validation error for '{tool_name}': {error_msg}")

        # Execute tool handler
        try:
            result = tool.handler(arguments, tenant_id=tenant_id, user_id=user_id)
            duration = (time.time() - start_time) * 1000
            audit = ToolExecutionAudit(
                tool_name=tool_name,
                tenant_id=tenant_id,
                user_id=user_id,
                risk_tier=tool.risk_tier.value,
                arguments=arguments,
                status="SUCCESS",
                duration_ms=duration,
            )
            self._audit_log.append(audit)
            return {
                "status": "success",
                "tool": tool_name,
                "result": result,
                "duration_ms": round(duration, 2),
            }
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            audit = ToolExecutionAudit(
                tool_name=tool_name,
                tenant_id=tenant_id,
                user_id=user_id,
                risk_tier=tool.risk_tier.value,
                arguments=arguments,
                status="EXECUTION_ERROR",
                duration_ms=duration,
                error_message=str(e),
            )
            self._audit_log.append(audit)
            raise e

    def get_audit_logs(self, tenant_id: Optional[str] = None) -> List[ToolExecutionAudit]:
        if tenant_id:
            return [log for log in self._audit_log if log.tenant_id == tenant_id]
        return list(self._audit_log)


mcp_registry = MCPRegistry()
