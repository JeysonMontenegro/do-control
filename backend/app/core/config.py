from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str = "postgresql+psycopg://docontrol:docontrol@postgres:5432/docontrol"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    integration_api_key: str = "appoint-me-dev-key"
    minio_endpoint: str = "http://minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "docontrol-files"
    dispatch_generation_job_enabled: bool = True
    dispatch_generation_job_interval_seconds: int = 60
    brevo_api_key: str | None = None
    email_from_address: str = "no-reply@docontrol.app"
    email_from_name: str = "do-control"
    app_url: str = "http://localhost:13000"
    email_delivery_enabled: bool = False
    password_reset_token_expire_minutes: int = 60
    admin_invite_token_expire_minutes: int = 1440
    doctor_onboarding_token_expire_minutes: int = 60
    recaptcha_site_key: str | None = None
    recaptcha_secret_key: str | None = None
    appointme_webhook_url: str | None = None
    appointme_integration_key: str | None = None
    appointme_webhook_enabled: bool = False
    appointme_webhook_timeout_seconds: int = 5
    med_ia_base_url: str | None = None
    med_ia_api_key: str | None = None
    med_ia_callback_secret: str | None = None
    med_ia_enabled: bool = False
    med_ia_timeout_seconds: int = 15
    med_ia_callback_tolerance_seconds: int = 300

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
