import pytest
from core.api.main import app
from core.auth import get_current_user
from core.models.models import User

def mock_get_current_user():
    return User(id="test-user-id", email="test@example.com", hashed_password="hashed_password", role="admin", is_active=True)

@pytest.fixture(autouse=True)
def override_auth(request):
    # Do not mock auth for authentic authentication test suites
    nodeid = getattr(request.node, "nodeid", "")
    if any(auth_suite in nodeid for auth_suite in ["test_routes_auth", "test_federated_jwt", "test_auth_"]):
        yield
        return

    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)
