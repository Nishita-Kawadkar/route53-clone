from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas import ZoneCreate, ZoneList, ZoneOut, ZoneUpdate
from app.services import zones as svc

router = APIRouter(
    prefix="/hosted-zones", tags=["hosted-zones"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=ZoneList)
def list_zones(
    search: str | None = None,
    name: str | None = None,
    comment: str | None = None,
    zone_id: str | None = None,
    type: Literal["public", "private"] | None = None,
    sort: str = "name",
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = svc.list_zones(
        db, search, type, sort, order, page, page_size,
        name=name, comment=comment, zone_id=zone_id,
    )
    return ZoneList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ZoneOut, status_code=status.HTTP_201_CREATED)
def create_zone(body: ZoneCreate, db: Session = Depends(get_db)):
    return svc.create_zone(db, body)


@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = svc.get_zone_or_404(db, zone_id)
    return svc.to_out(zone, svc.record_count(db, zone.id))


@router.patch("/{zone_id}", response_model=ZoneOut)
def update_zone(zone_id: str, body: ZoneUpdate, db: Session = Depends(get_db)):
    zone = svc.get_zone_or_404(db, zone_id)
    zone.comment = body.comment
    db.commit()
    return svc.to_out(zone, svc.record_count(db, zone.id))


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    svc.delete_zone(db, svc.get_zone_or_404(db, zone_id))