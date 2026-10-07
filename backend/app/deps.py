from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AuthSession, User, utcnow


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization[7:].strip()
    session = db.scalar(select(AuthSession).where(AuthSession.token == token))
    if not session or session.expires_at < utcnow():
        raise HTTPException(401, "Session expired or invalid")
    return session.user