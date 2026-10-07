def make(client, auth, name="example.com", **kw):
    return client.post("/api/hosted-zones", json={"name": name, **kw}, headers=auth)


def test_create_adds_ns_soa(client, auth):
    r = make(client, auth, "Example.com.", comment="main")
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "example.com."
    assert body["record_count"] == 2
    assert body["id"].startswith("Z")


def test_duplicate_conflict(client, auth):
    make(client, auth)
    assert make(client, auth).status_code == 409


def test_invalid_and_private_rules(client, auth):
    assert make(client, auth, "not a domain").status_code == 422
    assert make(client, auth, "corp.internal", type="private").status_code == 422
    assert make(client, auth, "corp.internal", type="private", vpc_id="vpc-123").status_code == 201


def test_search_and_pagination(client, auth):
    for n in ["alpha.com", "beta.com", "gamma.org"]:
        make(client, auth, n)
    r = client.get("/api/hosted-zones", params={"search": ".com"}, headers=auth).json()
    assert r["total"] == 2
    r = client.get("/api/hosted-zones", params={"page_size": 2, "page": 2}, headers=auth).json()
    assert len(r["items"]) == 1 and r["total"] == 3


def test_update_and_delete(client, auth):
    zid = make(client, auth).json()["id"]
    r = client.patch(f"/api/hosted-zones/{zid}", json={"comment": "new"}, headers=auth)
    assert r.json()["comment"] == "new"
    assert client.delete(f"/api/hosted-zones/{zid}", headers=auth).status_code == 204
    assert client.get(f"/api/hosted-zones/{zid}", headers=auth).status_code == 404


def test_property_filters(client, auth):
    make(client, auth, "alpha.com", comment="production site")
    make(client, auth, "beta.com", comment="staging")
    make(client, auth, "corp.internal", type="private", vpc_id="vpc-1")

    def total(**params):
        return client.get("/api/hosted-zones", params=params, headers=auth).json()["total"]

    assert total(comment="prod") == 1
    assert total(name="beta") == 1
    assert total(type="private") == 1
    assert total(search="alpha prod") == 1   # words are AND-ed
    assert total(search="alpha stag") == 0