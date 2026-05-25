from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, resume, recordings

# Create the database tables
Base.metadata.create_all(bind=engine)

# Automatically add transcript column if it doesn't exist
from sqlalchemy import text
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE recordings ADD COLUMN IF NOT EXISTS transcript TEXT;"))
except Exception as e:
    print(f"Database migration (ALTER TABLE recordings ADD COLUMN) failed/already done: {e}")

app = FastAPI(title="AI Interview Platform API")

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

