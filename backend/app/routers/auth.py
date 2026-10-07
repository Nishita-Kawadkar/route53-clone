from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import new_token, verify_password
from app.deps import get_current_user
from app.models import AuthSession, User, utcnow
from app.schemas import LoginIn, LoginOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect username or password")
    session = AuthSession(
        token=new_token(), user_id=user.id,
        expires_at=utcnow() + timedelta(hours=settings.session_ttl_hours),
    )
    db.add(session)
    db.commit()
    return LoginOut(token=session.token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        session = db.scalar(select(AuthSession).where(AuthSession.token == token))
        if session:
            db.delete(session)
            db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user