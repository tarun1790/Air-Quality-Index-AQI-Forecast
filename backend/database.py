import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database connection URL (defaults to SQLite, supports Google Cloud SQL / PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aqi_database.db")

# SQLite requires check_same_thread=False
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SearchLog(Base):
    """Stores user search queries and historical atmospheric readings."""
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    aqi = Column(Integer)
    weather_desc = Column(String, nullable=True)
    temp = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FavoriteCity(Base):
    """Stores user saved/bookmarked cities."""
    __tablename__ = "favorite_cities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    """Initializes all database tables on startup."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
