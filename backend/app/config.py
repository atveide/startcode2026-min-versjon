from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Backend"
    cors_origins: list[str] = ["http://localhost:5173"]
    anthropic_api_key: str | None = None
    database_path: str = "game.db"
    # Folder with the local Adressa import (articles.json and images/). Optional.
    adressa_cache_dir: str | None = None
    # The model that writes Opplyst's own story summaries (app.summaries). Never swapped silently.
    summary_model: str = "claude-sonnet-5-5"
    # Folder with the imported videos (app.import_videos); relative to backend/. Never committed.
    video_media_dir: str = "media/videos"
    # The public copies of the same files on the hosted frontend (deployed from a local build, see
    # README). Used where this machine has no copy, like the backend on Render. Empty: none.
    video_public_url: str = "https://startcode-august-demo.netlify.app/media/video"


settings = Settings()
