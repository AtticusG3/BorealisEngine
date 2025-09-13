from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Borealis Survey"
    MAG_MODEL_MAX_AGE_DAYS: int = 30


settings = Settings()