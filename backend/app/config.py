from dataclasses import dataclass
from dotenv import load_dotenv
import os
load_dotenv()

@dataclass(frozen=True)
class Settings:
    mssql_host: str
    mssql_port: int
    mssql_database: str
    mssql_user: str
    mssql_password: str


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_settings() -> Settings:
    return Settings(
        mssql_host=os.getenv("MSSQL_HOST", "radiata"),
        mssql_port=int(os.getenv("MSSQL_PORT", "1433")),
        mssql_database=_required_env("MSSQL_DATABASE"),
        mssql_user=_required_env("MSSQL_USER"),
        mssql_password=_required_env("MSSQL_PASSWORD")
    )
