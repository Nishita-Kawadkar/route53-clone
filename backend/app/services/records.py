import ipaddress
import re

from fastapi import HTTPException
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models import DnsRecord, HostedZone
from app.schemas import BulkDeleteOut, BulkSkipped, RecordIn, RecordOut


LABEL_RE = re.compile(r"^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$")
CAA_TAGS = {"issue", "issuewild", "iodef"}
SINGLE_VALUE = {"CNAME", "PTR", "SOA"}
SORTABLE = {"name": DnsRecord.name, "type": DnsRecord.type, "ttl": DnsRecord.ttl}


# ---------- value validation (pure functions, raise ValueError) ----------

def _labels_ok(name: str) -> bool:
    if not name or len(name) > 253:
        return False
    for i, label in enumerate(name.split(".")):
        if label == "*" and i == 0:
            continue
        if not LABEL_RE.match(label):
            return False
    return True


def _hostname(v: str) -> str:
    h = v.strip().lower().rstrip(".")
    if h.startswith("*") or not _labels_ok(h):
        raise ValueError(f"'{v}' is not a valid domain name")
    return h + "."


def _uint(s: str, lo: int, hi: int, label: str) -> int:
    if not s.isdigit() or not lo <= int(s) <= hi:
        raise ValueError(f"{label} must be a number between {lo} and {hi}")
    return int(s)


def _quote(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s.startswith('"') and s.endswith('"'):
        return s
    return '"' + s.replace('"', '\\"') + '"'


def _ipv4(v: str) -> str:
    try:
        return str(ipaddress.IPv4Address(v.strip()))
    except ValueError:
        raise ValueError(f"'{v}' is not a valid IPv4 address") from None


def _ipv6(v: str) -> str:
    try:
        return str(ipaddress.IPv6Address(v.strip()))
    except ValueError:
        raise ValueError(f"'{v}' is not a valid IPv6 address") from None


def _mx(v: str) -> str:
    p = v.split()
    if len(p) != 2:
        raise ValueError(f"MX value '{v}' must be '<priority> <mail server>'")
    return f"{_uint(p[0], 0, 65535, 'MX priority')} {_hostname(p[1])}"


def _srv(v: str) -> str:
    p = v.split()
    if len(p) != 4:
        raise ValueError(f"SRV value '{v}' must be '<priority> <weight> <port> <target>'")
    pri = _uint(p[0], 0, 65535, "SRV priority")
    weight = _uint(p[1], 0, 65535, "SRV weight")
    port = _uint(p[2], 0, 65535, "SRV port")
    return f"{pri} {weight} {port} {_hostname(p[3])}"


def _txt(v: str) -> str:
    if not v.strip():
        raise ValueError("TXT value cannot be empty")
    q = _quote(v)
    if len(q) > 4000:
        raise ValueError("TXT value is too long (max 4000 characters)")
    return q


def _caa(v: str) -> str:
    p = v.strip().split(None, 2)
    if len(p) != 3:
        raise ValueError(f"CAA value '{v}' must be '<flags> <tag> \"<value>\"'")
    flags = _uint(p[0], 0, 255, "CAA flags")
    tag = p[1].lower()
    if tag not in CAA_TAGS:
        raise ValueError("CAA tag must be one of: issue, issuewild, iodef")
    return f"{flags} {tag} {_quote(p[2])}"


def _soa(v: str) -> str:
    p = v.split()
    if len(p) != 7:
        raise ValueError("SOA value must have 7 fields")
    nums = [str(_uint(x, 0, 4294967295, "SOA field")) for x in p[2:]]
    return " ".join([_hostname(p[0]), _hostname(p[1]), *nums])


NORMALIZERS = {
    "A": _ipv4, "AAAA": _ipv6, "CNAME": _hostname, "NS": _hostname, "PTR": _hostname,
    "MX": _mx, "SRV": _srv, "TXT": _txt, "CAA": _caa, "SOA": _soa,
}


def normalize_values(rtype: str, values: list[str]) -> list[str]:
    cleaned = [v.strip() for v in values if v.strip()]
    if not cleaned:
        raise ValueError("At least one value is required")
    result: list[str] = []
    for v in cleaned:
        n = NORMALIZERS[rtype](v)
        if n not in result:
            result.append(n)
    if rtype in SINGLE_VALUE and len(result) > 1:
        raise ValueError(f"{rtype} records accept exactly one value")
    return result


def normalize_name(zone: HostedZone, raw: str) -> str:
    zone_base = zone.name.rstrip(".")
    text = raw.strip().lower()
    explicit_fqdn = text.endswith(".") and text != "."
    text = text.rstrip(".")
    if text in ("", "@", zone_base):
        return zone.name
    if text.endswith("." + zone_base):
        fqdn = text
    elif explicit_fqdn:
        raise ValueError(f"'{raw}' is outside the hosted zone {zone.name}")
    else:
        fqdn = f"{text}.{zone_base}"
    if not _labels_ok(fqdn):
        raise ValueError(f"'{raw}' is not a valid record name")
    return fqdn + "."


def prepare(zone: HostedZone, data: RecordIn) -> dict:
    """Validate and normalise input into column values. Raises 422 on bad input."""
    try:
        name = normalize_name(zone, data.name)
        if data.alias_target:
            if data.type not in ("A", "AAAA"):
                raise ValueError("Alias records are supported for A and AAAA types only")
            if data.values:
                raise ValueError("An alias record cannot also have values")
            target = {
                "dns_name": _hostname(data.alias_target.dns_name),
                "hosted_zone_id": data.alias_target.hosted_zone_id,
                "evaluate_target_health": data.alias_target.evaluate_target_health,
            }
            return dict(name=name, type=data.type, ttl=0, values=[], alias_target=target)
        values = normalize_values(data.type, data.values)
        return dict(name=name, type=data.type, ttl=data.ttl, values=values, alias_target=None)
    except ValueError as e:
        raise HTTPException(422, str(e)) from None


# ---------- rules and CRUD ----------

def is_default(rec: DnsRecord, zone: HostedZone) -> bool:
    return rec.type in ("NS", "SOA") and rec.name == zone.name


def to_out(r: DnsRecord) -> RecordOut:
    return RecordOut(
        id=r.id, zone_id=r.zone_id, name=r.name, type=r.type,
        ttl=None if r.alias_target else r.ttl, values=r.values or [],
        alias_target=r.alias_target or None, routing_policy=r.routing_policy,
        created_at=r.created_at, updated_at=r.updated_at,
    )


def get_record_or_404(db: Session, zone: HostedZone, record_id: int) -> DnsRecord:
    rec = db.get(DnsRecord, record_id)
    if not rec or rec.zone_id != zone.id:
        raise HTTPException(404, "No record found with the specified ID")
    return rec


def _check_conflicts(db: Session, zone: HostedZone, name: str, rtype: str, exclude_id: int | None):
    q = select(DnsRecord).where(DnsRecord.zone_id == zone.id, DnsRecord.name == name)
    if exclude_id:
        q = q.where(DnsRecord.id != exclude_id)
    others = db.scalars(q).all()
    if any(o.type == rtype for o in others):
        raise HTTPException(409, f"A {rtype} record named {name} already exists")
    if rtype == "CNAME":
        if name == zone.name:
            raise HTTPException(422, "A CNAME record cannot be created at the zone apex")
        if others:
            raise HTTPException(409, f"A CNAME cannot coexist with other records named {name}")
    elif any(o.type == "CNAME" for o in others):
        raise HTTPException(409, f"{name} already has a CNAME record; no other record types are allowed")


def create_record(db: Session, zone: HostedZone, data: RecordIn) -> RecordOut:
    if data.type == "SOA":
        raise HTTPException(422, "SOA records are created automatically with the hosted zone")
    fields = prepare(zone, data)
    _check_conflicts(db, zone, fields["name"], fields["type"], None)
    rec = DnsRecord(zone_id=zone.id, **fields)
    db.add(rec)
    db.commit()
    return to_out(rec)


def update_record(db: Session, zone: HostedZone, rec: DnsRecord, data: RecordIn) -> RecordOut:
    fields = prepare(zone, data)
    if is_default(rec, zone) and (fields["name"] != rec.name or fields["type"] != rec.type):
        raise HTTPException(422, "The name and type of the default NS and SOA records cannot be changed")
    if fields["type"] == "SOA" and not is_default(rec, zone):
        raise HTTPException(422, "Only the default apex record can be an SOA record")
    _check_conflicts(db, zone, fields["name"], fields["type"], rec.id)
    for key, value in fields.items():
        setattr(rec, key, value)
    db.commit()
    return to_out(rec)


def delete_record(db: Session, zone: HostedZone, rec: DnsRecord) -> None:
    if is_default(rec, zone):
        raise HTTPException(409, "The default NS and SOA records cannot be deleted")
    db.delete(rec)
    db.commit()


def list_records(db: Session, zone: HostedZone, search, types, sort, order, page, page_size):
    filters = [DnsRecord.zone_id == zone.id]
    if search:
        s = search.lower()
        filters.append(or_(
            func.lower(DnsRecord.name).contains(s, autoescape=True),
            func.lower(DnsRecord.type).contains(s, autoescape=True),
            func.lower(cast(DnsRecord.values, String)).contains(s, autoescape=True),
            func.lower(func.coalesce(cast(DnsRecord.alias_target, String), "")).contains(s, autoescape=True),
        ))
    if types:
        filters.append(DnsRecord.type.in_(types))

    col = SORTABLE.get(sort, DnsRecord.name)
    primary = col.desc() if order == "desc" else col.asc()
    total = db.scalar(select(func.count(DnsRecord.id)).where(*filters)) or 0
    rows = db.scalars(
        select(DnsRecord).where(*filters)
        .order_by(primary, DnsRecord.type.asc(), DnsRecord.id.asc())
        .offset((page - 1) * page_size).limit(page_size)
    ).all()
    return [to_out(r) for r in rows], total


def bulk_delete(db: Session, zone: HostedZone, ids: list[int]) -> BulkDeleteOut:
    ids = list(dict.fromkeys(ids))
    recs = db.scalars(
        select(DnsRecord).where(DnsRecord.zone_id == zone.id, DnsRecord.id.in_(ids))
    ).all()
    found = {r.id for r in recs}
    skipped = [BulkSkipped(id=i, reason="Record not found") for i in ids if i not in found]
    deleted: list[int] = []
    for r in recs:
        if is_default(r, zone):
            skipped.append(BulkSkipped(id=r.id, reason="Default NS and SOA records cannot be deleted"))
        else:
            db.delete(r)
            deleted.append(r.id)
    db.commit()
    return BulkDeleteOut(deleted=deleted, skipped=skipped)


