from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Borealis Reports"


settings = Settings()