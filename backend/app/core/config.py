from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://docontrol:docontrol@postgres:5432/docontrol"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    integration_api_key: str = "appoint-me-dev-key"
    minio_endpoint: str = "http://minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "docontrol-files"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
