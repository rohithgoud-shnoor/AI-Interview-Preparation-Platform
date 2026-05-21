from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, resume, recordings

# Create the database tables
Base.metadata.create_all(bind=engine)

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

