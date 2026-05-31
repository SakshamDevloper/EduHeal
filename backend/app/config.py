import os

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eduheal_super_secret_signing_key_2026_dev_mode_only")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for easy testing

settings = Settings()
