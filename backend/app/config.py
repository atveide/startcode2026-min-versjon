from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Backend"
    cors_origins: list[str] = ["http://localhost:5173"]
    anthropic_api_key: str | None = None
    database_path: str = "game.db"
    # Folder with the local Adressa import (articles.json and images/). Optional.
    adressa_cache_dir: str | None = None


settings = Settings()
