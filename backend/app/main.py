from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import User
from app.routers import auth, hosted_zones
from app.routers import auth, hosted_zones, records      # add "records"
from app.seed import seed_demo_data


def seed_demo_user() -> None:
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.username == settings.demo_username)):
            db.add(User(
                username=settings.demo_username,
                password_hash=hash_password(settings.demo_password),
            ))
            db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    seed_demo_user()
    yield


app = FastAPI(title="Route53 Clone API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(hosted_zones.router, prefix="/api")
app.include_router(records.router, prefix="/api")        # new


@app.get("/api/health")
def health():
    return {"status": "ok"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    seed_demo_user()
    if settings.seed_demo_data:
        seed_demo_data()
    yield
    