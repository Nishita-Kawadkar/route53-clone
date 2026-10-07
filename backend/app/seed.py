"""Demo data. Runs only when SEED_DEMO_DATA=true and the database has no hosted zones."""
from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models import HostedZone
from app.schemas import RecordIn, ZoneCreate
from app.services import records, zones

DEMO_ZONES = [
    {
        "zone": {"name": "example.com", "type": "public", "comment": "Production website"},
        "records": [
            {"name": "@", "type": "A", "ttl": 300, "values": ["192.0.2.10"]},
            {"name": "www", "type": "CNAME", "ttl": 300, "values": ["example.com"]},
            {"name": "api", "type": "A", "ttl": 60, "values": ["192.0.2.20", "192.0.2.21"]},
            {"name": "@", "type": "MX", "ttl": 3600, "values": ["10 mail.example.com", "20 mail2.example.com"]},
            {"name": "@", "type": "TXT", "ttl": 300, "values": ["v=spf1 include:_spf.example.net ~all"]},
            {"name": "_dmarc", "type": "TXT", "ttl": 300, "values": ["v=DMARC1; p=none"]},
            {"name": "@", "type": "CAA", "ttl": 3600, "values": ['0 issue "letsencrypt.org"']},
            {"name": "_sip._tcp", "type": "SRV", "ttl": 300, "values": ["10 60 5060 sip.example.com"]},
            {"name": "cdn", "type": "A", "alias_target": {"dns_name": "d111111abcdef8.cloudfront.net"}},
            *[
                {"name": f"node-{i:02d}", "type": "A", "ttl": 300, "values": [f"198.51.100.{i}"]}
                for i in range(1, 31)  # enough rows to demonstrate pagination
            ],
        ],
    },
    {
        "zone": {"name": "staging.example.com", "type": "public", "comment": "Staging environment"},
        "records": [
            {"name": "@", "type": "A", "ttl": 60, "values": ["203.0.113.5"]},
            {"name": "app", "type": "CNAME", "ttl": 60, "values": ["staging.example.com"]},
        ],
    },
    {
        "zone": {"name": "corp.internal", "type": "private", "comment": "Internal services", "vpc_id": "vpc-0a1b2c3d4e5f67890"},
        "records": [
            {"name": "db", "type": "A", "ttl": 300, "values": ["10.0.1.15"]},
            {"name": "cache", "type": "A", "ttl": 300, "values": ["10.0.1.16"]},
            {"name": "15.1.0.10.in-addr.arpa", "type": "PTR", "ttl": 300, "values": ["db.corp.internal"]},
        ],
    },
    {"zone": {"name": "mysite.org", "type": "public", "comment": None}, "records": []},
]


def seed_demo_data() -> None:
    with SessionLocal() as db:
        if db.scalar(select(func.count(HostedZone.id))):
            return  # never touch existing data
        for item in DEMO_ZONES:
            created = zones.create_zone(db, ZoneCreate(**item["zone"]))
            zone = zones.get_zone_or_404(db, created.id)
            for rec in item["records"]:
                records.create_record(db, zone, RecordIn(**rec))