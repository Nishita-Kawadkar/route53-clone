import pytest


@pytest.fixture()
def zone(client, auth):
    return client.post("/api/hosted-zones", json={"name": "example.com"}, headers=auth).json()


def url(zone):
    return f"/api/hosted-zones/{zone['id']}/records"


def add(client, auth, zone, **body):
    return client.post(url(zone), json=body, headers=auth)


def default_ids(client, auth, zone):
    items = client.get(url(zone), headers=auth).json()["items"]
    return {i["type"]: i["id"] for i in items}


def test_name_normalisation(client, auth, zone):
    r = add(client, auth, zone, name="WWW", type="A", ttl=60, values=["1.2.3.4"])
    assert r.status_code == 201 and r.json()["name"] == "www.example.com."
    r = add(client, auth, zone, name="@", type="A", values=["1.2.3.4"])
    assert r.json()["name"] == "example.com."
    r = add(client, auth, zone, name="api.example.com.", type="A", values=["1.2.3.4"])
    assert r.json()["name"] == "api.example.com."
    r = add(client, auth, zone, name="x.other.com.", type="A", values=["1.2.3.4"])
    assert r.status_code == 422


@pytest.mark.parametrize("rtype,given,expected", [
    ("A", ["1.2.3.4"], ["1.2.3.4"]),
    ("AAAA", ["2001:DB8::1"], ["2001:db8::1"]),
    ("TXT", ["v=spf1 -all"], ['"v=spf1 -all"']),
    ("MX", ["10 mail.example.com"], ["10 mail.example.com."]),
    ("SRV", ["1 5 5060 sip.example.com"], ["1 5 5060 sip.example.com."]),
    ("CAA", ['0 issue "letsencrypt.org"'], ['0 issue "letsencrypt.org"']),
    ("PTR", ["host.example.com"], ["host.example.com."]),
    ("NS", ["ns1.example.com", "ns2.example.com"], ["ns1.example.com.", "ns2.example.com."]),
    ("CNAME", ["target.example.org"], ["target.example.org."]),
])
def test_valid_types(client, auth, zone, rtype, given, expected):
    r = add(client, auth, zone, name=f"t-{rtype.lower()}", type=rtype, values=given)
    assert r.status_code == 201, r.text
    assert r.json()["values"] == expected


@pytest.mark.parametrize("rtype,values", [
    ("A", ["999.1.1.1"]), ("AAAA", ["1.2.3.4"]), ("MX", ["mail.example.com"]),
    ("SRV", ["1 2 3"]), ("CAA", ['0 bogus "x"']), ("CNAME", ["a.com", "b.com"]),
    ("A", []),
])
def test_invalid_values(client, auth, zone, rtype, values):
    r = add(client, auth, zone, name="bad", type=rtype, values=values)
    assert r.status_code == 422


def test_duplicate_and_cname_rules(client, auth, zone):
    assert add(client, auth, zone, name="www", type="A", values=["1.1.1.1"]).status_code == 201
    assert add(client, auth, zone, name="www", type="A", values=["2.2.2.2"]).status_code == 409
    assert add(client, auth, zone, name="www", type="CNAME", values=["a.com"]).status_code == 409
    assert add(client, auth, zone, name="blog", type="CNAME", values=["a.com"]).status_code == 201
    assert add(client, auth, zone, name="blog", type="A", values=["1.1.1.1"]).status_code == 409
    assert add(client, auth, zone, name="@", type="CNAME", values=["a.com"]).status_code == 422


def test_alias_record(client, auth, zone):
    r = add(client, auth, zone, name="cdn", type="A", alias_target={"dns_name": "d123.cloudfront.net"})
    assert r.status_code == 201
    assert r.json()["ttl"] is None and r.json()["values"] == []
    r = add(client, auth, zone, name="cdn2", type="TXT", alias_target={"dns_name": "x.com"})
    assert r.status_code == 422


def test_list_search_filter_paginate(client, auth, zone):
    add(client, auth, zone, name="www", type="A", values=["1.1.1.1"])
    add(client, auth, zone, name="_dmarc", type="TXT", values=["v=DMARC1"])
    add(client, auth, zone, name="mail", type="MX", values=["10 mx.example.com"])
    base = url(zone)
    assert client.get(base, headers=auth).json()["total"] == 5            # 3 + default NS, SOA
    assert client.get(base, params={"search": "_dmarc"}, headers=auth).json()["total"] == 1
    assert client.get(base, params={"search": "1.1.1.1"}, headers=auth).json()["total"] == 1
    assert client.get(base, params={"type": ["A", "MX"]}, headers=auth).json()["total"] == 2
    page = client.get(base, params={"page": 2, "page_size": 2}, headers=auth).json()
    assert len(page["items"]) == 2 and page["total"] == 5


def test_update_record(client, auth, zone):
    rid = add(client, auth, zone, name="api", type="A", values=["1.1.1.1"]).json()["id"]
    body = {"name": "api", "type": "A", "ttl": 120, "values": ["2.2.2.2", "3.3.3.3"]}
    r = client.put(f"{url(zone)}/{rid}", json=body, headers=auth)
    assert r.status_code == 200
    assert r.json()["ttl"] == 120 and r.json()["values"] == ["2.2.2.2", "3.3.3.3"]


def test_default_records_protected(client, auth, zone):
    ids = default_ids(client, auth, zone)
    assert client.delete(f"{url(zone)}/{ids['NS']}", headers=auth).status_code == 409
    assert client.delete(f"{url(zone)}/{ids['SOA']}", headers=auth).status_code == 409
    body = {"name": "@", "type": "A", "values": ["1.1.1.1"]}
    assert client.put(f"{url(zone)}/{ids['NS']}", json=body, headers=auth).status_code == 422
    assert add(client, auth, zone, name="@", type="SOA", values=["x"]).status_code == 422


def test_delete_and_bulk_delete(client, auth, zone):
    a = add(client, auth, zone, name="a", type="A", values=["1.1.1.1"]).json()["id"]
    b = add(client, auth, zone, name="b", type="A", values=["1.1.1.2"]).json()["id"]
    assert client.delete(f"{url(zone)}/{a}", headers=auth).status_code == 204
    assert client.get(f"{url(zone)}/{a}", headers=auth).status_code == 404

    ns = default_ids(client, auth, zone)["NS"]
    r = client.post(f"{url(zone)}/bulk-delete", json={"ids": [b, ns, 99999]}, headers=auth).json()
    assert r["deleted"] == [b]
    assert {s["id"] for s in r["skipped"]} == {ns, 99999}


def test_zone_with_records_cannot_be_deleted(client, auth, zone):
    add(client, auth, zone, name="www", type="A", values=["1.1.1.1"])
    assert client.delete(f"/api/hosted-zones/{zone['id']}", headers=auth).status_code == 409

