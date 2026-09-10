from __future__ import annotations

from fastapi.testclient import TestClient


def test_user_changes_own_password(client: TestClient, login):
    tokens = login("normal", "Normal123")

    response = client.put(
        "/api/auth/password",
        headers={"Authorization": f"Bearer {tokens['token']}"},
        json={"currentPassword": "Normal123", "newPassword": "Changed123"},
    )

    assert response.status_code == 200
    assert login("normal", "Changed123")["token"]


def test_wrong_current_password_is_rejected(client: TestClient, login):
    tokens = login("normal", "Normal123")

    response = client.put(
        "/api/auth/password",
        headers={"Authorization": f"Bearer {tokens['token']}"},
        json={"currentPassword": "Wrong123", "newPassword": "Changed123"},
    )

    assert response.status_code == 400
    assert response.json()["message"] == "当前密码错误"


def test_new_password_over_bcrypt_limit_is_rejected(client: TestClient, login):
    tokens = login("normal", "Normal123")

    response = client.put(
        "/api/auth/password",
        headers={"Authorization": f"Bearer {tokens['token']}"},
        json={"currentPassword": "Normal123", "newPassword": "密" * 25},
    )

    assert response.status_code == 422


def test_old_access_and_refresh_tokens_expire_after_change(client: TestClient, login):
    tokens = login("normal", "Normal123")

    changed = client.put(
        "/api/auth/password",
        headers={"Authorization": f"Bearer {tokens['token']}"},
        json={"currentPassword": "Normal123", "newPassword": "Changed123"},
    )

    assert changed.status_code == 200
    assert client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {tokens['token']}"}
    ).status_code == 401
    assert client.post(
        "/api/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    ).status_code == 401


def test_admin_resets_another_users_password(client: TestClient, login, normal_user_id: int):
    normal_tokens = login("normal", "Normal123")
    admin_tokens = login("admin", "Admin123")

    response = client.put(
        f"/api/admin/users/{normal_user_id}",
        headers={"Authorization": f"Bearer {admin_tokens['token']}"},
        json={"password": "Reset123"},
    )

    assert response.status_code == 200
    assert client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {normal_tokens['token']}"}
    ).status_code == 401
    assert client.post(
        "/api/auth/refresh", json={"refreshToken": normal_tokens["refreshToken"]}
    ).status_code == 401
    assert login("normal", "Reset123")["token"]


def test_non_admin_cannot_reset_another_users_password(
    client: TestClient, login, admin_user_id: int
):
    user_tokens = login("normal", "Normal123")

    response = client.put(
        f"/api/admin/users/{admin_user_id}",
        headers={"Authorization": f"Bearer {user_tokens['token']}"},
        json={"password": "Hacked123"},
    )

    assert response.status_code == 403


def test_omitted_admin_password_keeps_existing_password(
    client: TestClient, login, normal_user_id: int
):
    admin_tokens = login("admin", "Admin123")

    response = client.put(
        f"/api/admin/users/{normal_user_id}",
        headers={"Authorization": f"Bearer {admin_tokens['token']}"},
        json={"status": "active"},
    )

    assert response.status_code == 200
    assert login("normal", "Normal123")["token"]
