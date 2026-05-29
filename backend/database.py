import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Determine database url
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Determine if running locally
is_local = not os.getenv("RENDER")

# Force local PostgreSQL when running locally so it doesn't save to production Neon
if is_local:
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:post123@localhost:5432/ai_interview"

# Helper to automatically create PostgreSQL database if missing
def ensure_database_exists(db_url):
    if not db_url.startswith("postgresql"):
        return
    from urllib.parse import urlparse
    parsed = urlparse(db_url)
    db_name = parsed.path.lstrip('/')
    if not db_name:
        return

    # Connect to the default 'postgres' database to check/create the target database
    base_url = db_url.replace(f"/{db_name}", "/postgres")
    try:
        temp_engine = create_engine(base_url, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
            if not result.scalar():
                print(f"Creating local PostgreSQL database: {db_name}")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
        temp_engine.dispose()
    except Exception as e:
        print(f"Auto-database creation check info: {e}")

if is_local:
    ensure_database_exists(SQLALCHEMY_DATABASE_URL)

# Create engine with sqlite-specific options if needed
connect_args = {}
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    # If postgres connection failed and we are running locally, fallback to SQLite
    if is_local and not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        print(f"Failed to connect to local PostgreSQL ({e}). Falling back to local SQLite database: ai_interview.db")
        SQLALCHEMY_DATABASE_URL = "sqlite:///./ai_interview.db"
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
