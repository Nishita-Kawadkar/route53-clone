from datetime import datetime, timezone

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class AuthSession(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime]
    user: Mapped[User] = relationship()


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (UniqueConstraint("name", "type", name="uq_zone_name_type"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)   # e.g. Z0A1B2C3D4E5F6G7H8I9
    name: Mapped[str] = mapped_column(String(255), index=True)       # "example.com."
    type: Mapped[str] = mapped_column(String(10))                    # public | private
    comment: Mapped[str | None] = mapped_column(String(256))
    vpc_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    records: Mapped[list["DnsRecord"]] = relationship(
        back_populates="zone", cascade="all, delete-orphan", passive_deletes=True
    )


class DnsRecord(Base):
    __tablename__ = "dns_records"
    __table_args__ = (
        UniqueConstraint("zone_id", "name", "type", name="uq_record_zone_name_type"),
        Index("ix_records_zone_type", "zone_id", "type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(10))
    ttl: Mapped[int] = mapped_column(Integer, default=300)
    routing_policy: Mapped[str] = mapped_column(String(20), default="simple")
    values: Mapped[list[str]] = mapped_column(JSON, default=list)
    alias_target: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    zone: Mapped[HostedZone] = relationship(back_populates="records")