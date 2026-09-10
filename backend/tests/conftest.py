from __future__ import annotations

from collections.abc import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Role, User
from app.security import hash_password


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    with testing_session() as db:
        admin_role = Role(name="系统管理员", permissions=["admin"])
        user_role = Role(name="普通用户", permissions=["qa:ask"])
        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=hash_password("Admin123"),
            roles=[admin_role],
        )
        normal = User(
            username="normal",
            email="normal@example.com",
            password_hash=hash_password("Normal123"),
            roles=[user_role],
        )
        db.add_all([admin, normal])
        db.commit()
        db.refresh(admin)
        db.refresh(normal)
        user_ids = {"admin": admin.id, "normal": normal.id}

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    test_client.user_ids = user_ids  # type: ignore[attr-defined]
    yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def login(client: TestClient) -> Callable[[str, str], dict]:
    def do_login(username: str, password: str) -> dict:
        response = client.post(
            "/api/auth/login",
            json={"username": username, "password": password},
        )
        assert response.status_code == 200, response.text
        return response.json()["data"]

    return do_login


@pytest.fixture()
def admin_user_id(client: TestClient) -> int:
    return client.user_ids["admin"]  # type: ignore[attr-defined]


@pytest.fixture()
def normal_user_id(client: TestClient) -> int:
    return client.user_ids["normal"]  # type: ignore[attr-defined]
