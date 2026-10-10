"""Drop and recreate all tables. DEVELOPMENT ONLY.

The user/scan tables changed shape (hashed_password, user_id, risk_score, ...) and
`create_all` never alters existing tables, so run this once after upgrading:

    cd backend
    python -m scripts.reset_db --yes
"""
import sys

import app.models  # noqa: F401
from app.core.config import settings
from app.database import Base, engine


def main() -> None:
    if settings.ENVIRONMENT.lower() == "production":
        sys.exit("Refusing to reset the database when ENVIRONMENT=production")
    if "--yes" not in sys.argv:
        sys.exit(f"This DELETES ALL DATA in {engine.url.render_as_string(hide_password=True)}. Re-run with --yes.")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset.")


if __name__ == "__main__":
    main()
