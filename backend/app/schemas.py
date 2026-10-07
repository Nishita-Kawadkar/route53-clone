import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

DOMAIN_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$")


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    model_config = {"from_attributes": True}


class LoginOut(BaseModel):
    token: str
    user: UserOut


class ZoneCreate(BaseModel):
    name: str
    type: Literal["public", "private"] = "public"
    comment: str | None = Field(default=None, max_length=256)
    vpc_id: str | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        v = v.strip().lower().rstrip(".")
        if not DOMAIN_RE.match(v):
            raise ValueError("Invalid domain name")
        return v + "."

    @model_validator(mode="after")
    def private_needs_vpc(self):
        if self.type == "private" and not self.vpc_id:
            raise ValueError("A VPC is required for private hosted zones")
        return self


class ZoneUpdate(BaseModel):
    comment: str | None = Field(default=None, max_length=256)


class ZoneOut(BaseModel):
    id: str
    name: str
    type: str
    comment: str | None
    vpc_id: str | None
    record_count: int
    created_at: datetime


class ZoneList(BaseModel):
    items: list[ZoneOut]
    total: int
    page: int
    page_size: int

RecordType = Literal["A", "AAAA", "CAA", "CNAME", "MX", "NS", "PTR", "SOA", "SRV", "TXT"]


class AliasTarget(BaseModel):
    dns_name: str
    hosted_zone_id: str | None = None
    evaluate_target_health: bool = False


class RecordIn(BaseModel):
    name: str = ""                                   # "" or "@" = zone apex
    type: RecordType
    ttl: int = Field(default=300, ge=0, le=2147483647)
    values: list[str] = Field(default_factory=list)  # one entry per line in the UI
    alias_target: AliasTarget | None = None
    routing_policy: Literal["simple"] = "simple"


class RecordOut(BaseModel):
    id: int
    zone_id: str
    name: str
    type: str
    ttl: int | None          # None for alias records
    values: list[str]
    alias_target: dict | None
    routing_policy: str
    created_at: datetime
    updated_at: datetime


class RecordList(BaseModel):
    items: list[RecordOut]
    total: int
    page: int
    page_size: int


class BulkDeleteIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


class BulkSkipped(BaseModel):
    id: int
    reason: str


class BulkDeleteOut(BaseModel):
    deleted: list[int]
    skipped: list[BulkSkipped]

