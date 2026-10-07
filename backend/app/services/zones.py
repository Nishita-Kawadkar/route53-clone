import random
import secrets
import string

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import DnsRecord, HostedZone
from app.schemas import ZoneCreate, ZoneOut

SORTABLE = {
    "name": HostedZone.name,
    "type": HostedZone.type,
    "created_at": HostedZone.created_at,
    "id": HostedZone.id,
}


def _zone_id() -> str:
    return "Z" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(20))


def _name_servers() -> list[str]:
    tlds = ["com", "net", "org", "co.uk"]
    return [
        f"ns-{random.randint(100, 2000)}.awsdns-{random.randint(10, 63)}.{tld}."
        for tld in tlds
    ]


def to_out(zone: HostedZone, record_count: int) -> ZoneOut:
    return ZoneOut(
        id=zone.id, name=zone.name, type=zone.type, comment=zone.comment,
        vpc_id=zone.vpc_id, record_count=record_count, created_at=zone.created_at,
    )


def create_zone(db: Session, data: ZoneCreate) -> ZoneOut:
    exists = db.scalar(
        select(HostedZone.id).where(HostedZone.name == data.name, HostedZone.type == data.type)
    )
    if exists:
        raise HTTPException(409, f"A {data.type} hosted zone for {data.name} already exists")

    zone = HostedZone(
        id=_zone_id(), name=data.name, type=data.type,
        comment=data.comment, vpc_id=data.vpc_id,
    )
    ns = _name_servers()
    zone.records = [
        DnsRecord(name=data.name, type="NS", ttl=172800, values=ns),
        DnsRecord(
            name=data.name, type="SOA", ttl=900,
            values=[f"{ns[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"],
        ),
    ]
    db.add(zone)
    db.commit()
    return to_out(zone, 2)


def get_zone_or_404(db: Session, zone_id: str) -> HostedZone:
    zone = db.get(HostedZone, zone_id)
    if not zone:
        raise HTTPException(404, "No hosted zone found with the specified ID")
    return zone


def record_count(db: Session, zone_id: str) -> int:
    return db.scalar(select(func.count(DnsRecord.id)).where(DnsRecord.zone_id == zone_id)) or 0


def _contains(column, term: str):
    return func.lower(func.coalesce(column, "")).contains(term.lower(), autoescape=True)


def list_zones(db, search, zone_type, sort, order, page, page_size,
               name=None, comment=None, zone_id=None):
    filters = []
    for term in (search or "").split():   # every word must match name, description or ID
        filters.append(or_(
            _contains(HostedZone.name, term),
            _contains(HostedZone.comment, term),
            _contains(HostedZone.id, term),
        ))
    if name:
        filters.append(_contains(HostedZone.name, name))
    if comment:
        filters.append(_contains(HostedZone.comment, comment))
    if zone_id:
        filters.append(_contains(HostedZone.id, zone_id))
    if zone_type:
        filters.append(HostedZone.type == zone_type)

    counts = (
        select(DnsRecord.zone_id, func.count().label("n"))
        .group_by(DnsRecord.zone_id).subquery()
    )
    sort_col = SORTABLE.get(sort, HostedZone.name)
    sort_col = sort_col.desc() if order == "desc" else sort_col.asc()

    total = db.scalar(select(func.count(HostedZone.id)).where(*filters)) or 0
    rows = db.execute(
        select(HostedZone, func.coalesce(counts.c.n, 0))
        .outerjoin(counts, counts.c.zone_id == HostedZone.id)
        .where(*filters)
        .order_by(sort_col)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [to_out(z, n) for z, n in rows], total

def delete_zone(db: Session, zone: HostedZone) -> None:
    custom = db.scalar(
        select(func.count(DnsRecord.id)).where(
            DnsRecord.zone_id == zone.id,
            ~((DnsRecord.type.in_(["NS", "SOA"])) & (DnsRecord.name == zone.name)),
        )
    )
    if custom:
        raise HTTPException(409, "The hosted zone contains records other than the default NS and SOA records")
    db.delete(zone)
    db.commit()