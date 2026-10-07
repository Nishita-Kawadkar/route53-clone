from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models import HostedZone
from app.schemas import BulkDeleteIn, BulkDeleteOut, RecordIn, RecordList, RecordOut, RecordType
from app.services import records as svc
from app.services.zones import get_zone_or_404

router = APIRouter(
    prefix="/hosted-zones/{zone_id}/records",
    tags=["records"],
    dependencies=[Depends(get_current_user)],
)


def zone_dep(zone_id: str, db: Session = Depends(get_db)) -> HostedZone:
    return get_zone_or_404(db, zone_id)


@router.get("", response_model=RecordList)
def list_records(
    search: str | None = None,
    type: list[RecordType] | None = Query(default=None),   # repeatable: ?type=A&type=TXT
    sort: str = "name",
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    zone: HostedZone = Depends(zone_dep),
    db: Session = Depends(get_db),
):
    items, total = svc.list_records(db, zone, search, type, sort, order, page, page_size)
    return RecordList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_record(body: RecordIn, zone: HostedZone = Depends(zone_dep), db: Session = Depends(get_db)):
    return svc.create_record(db, zone, body)


@router.post("/bulk-delete", response_model=BulkDeleteOut)
def bulk_delete(body: BulkDeleteIn, zone: HostedZone = Depends(zone_dep), db: Session = Depends(get_db)):
    return svc.bulk_delete(db, zone, body.ids)


@router.get("/{record_id}", response_model=RecordOut)
def get_record(record_id: int, zone: HostedZone = Depends(zone_dep), db: Session = Depends(get_db)):
    return svc.to_out(svc.get_record_or_404(db, zone, record_id))


@router.put("/{record_id}", response_model=RecordOut)
def update_record(
    record_id: int, body: RecordIn, zone: HostedZone = Depends(zone_dep), db: Session = Depends(get_db)
):
    return svc.update_record(db, zone, svc.get_record_or_404(db, zone, record_id), body)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, zone: HostedZone = Depends(zone_dep), db: Session = Depends(get_db)):
    svc.delete_record(db, zone, svc.get_record_or_404(db, zone, record_id))

