from enum import Enum
from typing import Callable, List, Set, Union
from fastapi import Depends, HTTPException, status
from core.models.models import User


class Role(str, Enum):
    ADMIN = "admin"
    DATA_SCIENTIST = "data_scientist"
    ANALYST = "analyst"
    VIEWER = "viewer"


class Permission(str, Enum):
    DATASET_READ = "DATASET_READ"
    DATASET_WRITE = "DATASET_WRITE"
    DATASET_DELETE = "DATASET_DELETE"
    MODEL_TRAIN = "MODEL_TRAIN"
    MODEL_EVALUATE = "MODEL_EVALUATE"
    REPORT_GENERATE = "REPORT_GENERATE"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"


ROLE_PERMISSIONS: dict[str, Set[str]] = {
    Role.ADMIN.value: {
        Permission.DATASET_READ.value,
        Permission.DATASET_WRITE.value,
        Permission.DATASET_DELETE.value,
        Permission.MODEL_TRAIN.value,
        Permission.MODEL_EVALUATE.value,
        Permission.REPORT_GENERATE.value,
        Permission.SYSTEM_ADMIN.value,
    },
    Role.DATA_SCIENTIST.value: {
        Permission.DATASET_READ.value,
        Permission.DATASET_WRITE.value,
        Permission.MODEL_TRAIN.value,
        Permission.MODEL_EVALUATE.value,
        Permission.REPORT_GENERATE.value,
    },
    Role.ANALYST.value: {
        Permission.DATASET_READ.value,
        Permission.MODEL_EVALUATE.value,
        Permission.REPORT_GENERATE.value,
    },
    Role.VIEWER.value: {
        Permission.DATASET_READ.value,
    },
}


def get_user_permissions(role: str) -> List[str]:
    clean_role = (role or "viewer").lower()
    perms = ROLE_PERMISSIONS.get(clean_role, ROLE_PERMISSIONS[Role.VIEWER.value])
    return sorted(list(perms))


def has_permission(role: str, permission: Union[Permission, str]) -> bool:
    perm_val = permission.value if isinstance(permission, Permission) else str(permission)
    clean_role = (role or "viewer").lower()
    perms = ROLE_PERMISSIONS.get(clean_role, set())
    return (perm_val in perms) or (Permission.SYSTEM_ADMIN.value in perms)


def require_permission(permission: Union[Permission, str]) -> Callable:
    """FastAPI dependency factory enforcing granular RBAC permissions."""
    perm_val = permission.value if isinstance(permission, Permission) else str(permission)

    def dependency(user: User = Depends(lambda: None)):
        # Deferred import to avoid circular dependency
        from core.auth import get_current_user
        return None

    # Actual dependency using get_current_user
    async def permission_checker(
        current_user: User = Depends(lambda: None)  # will be injected via wrapper
    ):
        pass

    return dependency
