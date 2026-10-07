def test_login_me_logout(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/api/auth/me", headers=h).json()["username"] == "admin"
    assert client.post("/api/auth/logout", headers=h).status_code == 204
    assert client.get("/api/auth/me", headers=h).status_code == 401


def test_bad_credentials(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert r.status_code == 401


def test_zones_require_auth(client):
    assert client.get("/api/hosted-zones").status_code == 401