import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/register",
            json={"email": "new@example.com", "password": "Pass@1234", "full_name": "New User"},
        )
        assert res.status_code == 201
        body = res.json()
        assert body["success"] is True
        assert body["data"]["email"] == "new@example.com"

    async def test_register_duplicate_email(self, client: AsyncClient, registered_user: dict):
        res = await client.post("/api/v1/auth/register", json=registered_user)
        assert res.status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/register",
            json={"email": "not-an-email", "password": "Pass@1234"},
        )
        assert res.status_code == 422

    async def test_register_short_password(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/register",
            json={"email": "short@example.com", "password": "123"},
        )
        assert res.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient, registered_user: dict):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body["data"]["tokens"]
        assert "refresh_token" in body["data"]["tokens"]

    async def test_login_wrong_password(self, client: AsyncClient, registered_user: dict):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": "wrong_password"},
        )
        assert res.status_code == 401

    async def test_login_wrong_email(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "Pass@1234"},
        )
        assert res.status_code == 401


class TestMe:
    async def test_get_me_success(self, client: AsyncClient, auth_headers: dict, registered_user: dict):
        res = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["data"]["email"] == registered_user["email"]

    async def test_get_me_unauthorized(self, client: AsyncClient):
        res = await client.get("/api/v1/auth/me")
        assert res.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient):
        res = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert res.status_code == 401


class TestRefreshToken:
    async def test_refresh_success(self, client: AsyncClient, registered_user: dict):
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
        refresh_token = login_res.json()["data"]["tokens"]["refresh_token"]

        res = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
        )
        assert res.status_code == 200
        assert "access_token" in res.json()["data"]

    async def test_refresh_invalid_token(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "invalid.token"}
        )
        assert res.status_code == 401
