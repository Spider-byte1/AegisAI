from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


DATABASE_URL = "postgresql+psycopg://postgres:Sudha12%4012@localhost:5432/aegisai_db"


Engine = create_engine(
    DATABASE_URL
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=Engine
)


Base = declarative_base()