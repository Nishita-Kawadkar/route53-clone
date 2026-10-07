from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./route53.db"
    session_ttl_hours: int = 24 * 7
    cors_origins: list[str] = ["http://localhost:3000"]
    demo_username: str = "admin"
    demo_password: str = "admin123"
    seed_demo_data: bool = False


settings = Settings()