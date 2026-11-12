import pytest
from fastapi.testclient import TestClient
from core.main import app
from core.repositories.database import SessionLocal, Base, engine
from core.models.models import User, Conversation, ChatMessage
from core.auth import create_access_token, get_password_hash, get_current_user
import uuid

@pytest.fixture(scope="module")
def setup_db():
    # Remove any mock overrides so real JWT tokens and user isolation are tested
    app.dependency_overrides.pop(get_current_user, None)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Create two isolated test users
    user_a = db.query(User).filter_by(email="alice_test@agentix.com").first()
    if not user_a:
        user_a = User(
            id=str(uuid.uuid4()),
            email="alice_test@agentix.com",
            hashed_password=get_password_hash("password123"),
            role="user",
            is_active=True,
        )
        db.add(user_a)

    user_b = db.query(User).filter_by(email="bob_test@agentix.com").first()
    if not user_b:
        user_b = User(
            id=str(uuid.uuid4()),
            email="bob_test@agentix.com",
            hashed_password=get_password_hash("password123"),
            role="user",
            is_active=True,
        )
        db.add(user_b)
    
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    
    token_a = create_access_token({"sub": user_a.id, "email": user_a.email, "role": user_a.role})
    token_b = create_access_token({"sub": user_b.id, "email": user_b.email, "role": user_b.role})
    
    yield {
        "user_a": user_a,
        "user_b": user_b,
        "headers_a": {"Authorization": f"Bearer {token_a}"},
        "headers_b": {"Authorization": f"Bearer {token_b}"},
    }
    db.close()


def test_conversation_lifecycle_and_security(setup_db):
    app.dependency_overrides.pop(get_current_user, None)
    client = TestClient(app)
    headers_a = setup_db["headers_a"]
    headers_b = setup_db["headers_b"]
    user_a = setup_db["user_a"]
    user_b = setup_db["user_b"]

    # 1. User A creates conversation
    create_res = client.post(
        "/api/v1/platform/conversations",
        headers=headers_a,
        json={"title": "Q3 Revenue Analysis"}
    )
    assert create_res.status_code == 200
    res_data = create_res.json()["data"]
    conv_id = res_data["id"]
    assert res_data["title"] == "Q3 Revenue Analysis"

    # 2. User A lists conversations - should see it
    list_a = client.get("/api/v1/platform/conversations", headers=headers_a)
    assert list_a.status_code == 200
    conv_ids_a = [c["id"] for c in list_a.json()["data"]]
    assert conv_id in conv_ids_a

    # 3. User B lists conversations - MUST NOT see User A's conversation (Tenant / User isolation)
    list_b = client.get("/api/v1/platform/conversations", headers=headers_b)
    assert list_b.status_code == 200
    conv_ids_b = [c["id"] for c in list_b.json()["data"]]
    assert conv_id not in conv_ids_b

    # 4. User B attempts IDOR on User A's conversation (Read)
    get_b = client.get(f"/api/v1/platform/conversations/{conv_id}", headers=headers_b)
    assert get_b.status_code == 403

    # 5. User B attempts IDOR on User A's conversation (Rename)
    rename_b = client.put(
        f"/api/v1/platform/conversations/{conv_id}",
        headers=headers_b,
        json={"title": "Hacked Title"}
    )
    assert rename_b.status_code == 403

    # 6. User B attempts IDOR on User A's conversation (Delete)
    delete_b = client.delete(f"/api/v1/platform/conversations/{conv_id}", headers=headers_b)
    assert delete_b.status_code == 403

    # 7. Add messages to User A's conversation directly and verify cascade
    db = SessionLocal()
    try:
        msg1 = ChatMessage(conversation_id=conv_id, role="user", content="What is the gross margin?")
        msg2 = ChatMessage(conversation_id=conv_id, role="agent", content="Gross margin is 42.5%.")
        db.add_all([msg1, msg2])
        db.commit()
    finally:
        db.close()

    # User A gets conversation details and sees messages
    get_a = client.get(f"/api/v1/platform/conversations/{conv_id}", headers=headers_a)
    assert get_a.status_code == 200
    assert len(get_a.json()["data"]["messages"]) == 2

    # 8. User A renames conversation
    rename_a = client.put(
        f"/api/v1/platform/conversations/{conv_id}",
        headers=headers_a,
        json={"title": "Updated Q3 Margin Analysis"}
    )
    assert rename_a.status_code == 200
    assert rename_a.json()["data"]["title"] == "Updated Q3 Margin Analysis"

    # 9. User A deletes conversation
    delete_a = client.delete(f"/api/v1/platform/conversations/{conv_id}", headers=headers_a)
    assert delete_a.status_code == 200
    assert delete_a.json()["data"]["deleted"] is True

    # 10. Verify 404 after deletion
    get_a_deleted = client.get(f"/api/v1/platform/conversations/{conv_id}", headers=headers_a)
    assert get_a_deleted.status_code == 404

    # 11. Verify cascading deletion - no orphaned ChatMessage in database
    db = SessionLocal()
    try:
        orphans = db.query(ChatMessage).filter_by(conversation_id=conv_id).all()
        assert len(orphans) == 0
    finally:
        db.close()
