# Single source of truth for the DB dependency lives in app.database.database.
from app.database.database import get_db

__all__ = ["get_db"]
