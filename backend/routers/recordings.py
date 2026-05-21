from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import cloudinary
import cloudinary.uploader
from typing import List

import models, schemas, database
from routers.auth import get_current_user

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

# Cloudinary configuration
import os
from dotenv import load_dotenv
load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

@router.post("/upload", response_model=schemas.Recording)
def upload_recording(
    file: UploadFile = File(...),
    question: str = Form(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Ensure file pointer is at start
        file.file.seek(0)
        # Upload to cloudinary as video
        result = cloudinary.uploader.upload(
            file.file,
            resource_type="video",
            folder="interview_recordings",
            public_id=None,
            timeout=60
        )
        video_url = result.get("secure_url")
        if not video_url:
            raise Exception("Cloudinary did not return a secure_url")
        # Save to database
        db_recording = models.Recording(
            user_id=current_user.id,
            question=question,
            video_url=video_url,
            created_at=datetime.utcnow().isoformat()
        )
        db.add(db_recording)
        db.commit()
        db.refresh(db_recording)
        return db_recording
    except Exception as e:
        # Log the error for debugging
        print(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload video: {str(e)}")

@router.get("/me", response_model=List[schemas.Recording])
def get_my_recordings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    recordings = db.query(models.Recording).filter(models.Recording.user_id == current_user.id).order_by(models.Recording.id.desc()).all()
    return recordings
