from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routers import auth, resume, recordings

# Create the database tables
Base.metadata.create_all(bind=engine)


# Automatically add transcript, ai_analysis, and video_analysis columns if they don't exist
from sqlalchemy import text
import os
try:
    with engine.begin() as conn:
        # Run each migration in its own try/except block to avoid failure if column already exists (especially for SQLite)
        for col in ["transcript", "ai_analysis", "video_analysis"]:
            try:
                # PostgreSQL support
                if engine.url.drivername.startswith("postgresql"):
                    conn.execute(text(f"ALTER TABLE recordings ADD COLUMN IF NOT EXISTS {col} TEXT;"))
                else:
                    # SQLite support (no IF NOT EXISTS, so try and catch error if it already exists)
                    conn.execute(text(f"ALTER TABLE recordings ADD COLUMN {col} TEXT;"))
            except Exception as col_err:
                # Column might already exist, which is expected
                print(f"Column migration info for {col}: {col_err}")
        
        # Add new columns to users table
        for col in ["phone_number", "college_name", "specialization", "profile_picture"]:
            try:
                if engine.url.drivername.startswith("postgresql"):
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} TEXT;"))
                else:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} TEXT;"))
            except Exception as col_err:
                print(f"Column migration info for user {col}: {col_err}")
except Exception as e:
    print(f"Database migration failed/already done: {e}")



app = FastAPI(title="AI Interview Platform API")

# Ensure uploads directory and profile_pictures subdirectory exist
os.makedirs("uploads/profile_pictures", exist_ok=True)

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(recordings.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Interview Preparation Platform API"}

