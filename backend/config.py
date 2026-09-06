from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./puddlex.db"
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    OSRM_BASE_URL: str = "http://router.project-osrm.org"
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
