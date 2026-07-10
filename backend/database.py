import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use SQLite as fallback if DATABASE_URL is not set or if user doesn't have Postgres running easily
raw_url = os.getenv("DATABASE_URL", "sqlite:///./puddlex.db")
if raw_url.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = raw_url.replace("postgres://", "postgresql://", 1)
else:
    SQLALCHEMY_DATABASE_URL = raw_url

# If using SQLite, we need connect_args={"check_same_thread": False}
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
