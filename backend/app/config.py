from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Backend"
    cors_origins: list[str] = ["http://localhost:5173"]
    database_path: str = "game.db"


settings = Settings()
