from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from jose import jwt
import os
import shutil
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

import schemas, crud, models, database

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-for-jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(database.get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=user_credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not crud.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "name": user.name}

@router.post("/google", response_model=schemas.Token)
def google_login(request_data: schemas.GoogleLoginRequest, db: Session = Depends(database.get_db)):
    token = request_data.token
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    if not google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID not configured on the server."
        )
    
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            google_client_id
        )
        
        # ID token is valid. Extract user info.
        email = idinfo.get("email")
        name = idinfo.get("name", "")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided in Google ID token."
            )
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {str(e)}"
        )
        
    # Check if the user already exists in our database
    user = crud.get_user_by_email(db, email=email)
    
    if not user:
        # If the user doesn't exist, create a new user profile
        user = crud.create_google_user(db, email=email, name=name)
        
    # Generate our JWT access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "name": user.name}

@router.get("/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

class ProfileUpdate(BaseModel):
    name: str
    email: str
    phone_number: Optional[str] = None
    college_name: Optional[str] = None
    specialization: Optional[str] = None

@router.put("/profile", response_model=schemas.User)
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if another user has this email
    if profile_data.email != current_user.email:
        existing_user = crud.get_user_by_email(db, email=profile_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email is already in use by another account.")
        current_user.email = profile_data.email
        
    current_user.name = profile_data.name
    current_user.phone_number = profile_data.phone_number
    current_user.college_name = profile_data.college_name
    current_user.specialization = profile_data.specialization
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/profile/picture", response_model=schemas.User)
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Ensure it's an image
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, GIF, and WEBP image formats are supported.")
        
    # Check if Cloudinary is configured
    cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    
    if cloudinary_cloud_name:
        try:
            import cloudinary
            import cloudinary.uploader
            
            # Setup Cloudinary config just in case it isn't set globally on this router
            cloudinary.config(
                cloud_name=cloudinary_cloud_name,
                api_key=os.getenv("CLOUDINARY_API_KEY"),
                api_secret=os.getenv("CLOUDINARY_API_SECRET"),
                secure=True,
            )
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file.file,
                folder="profile_pictures",
                public_id=f"user_{current_user.id}",
                overwrite=True,
                resource_type="image"
            )
            current_user.profile_picture = result.get("secure_url")
            db.commit()
            db.refresh(current_user)
            return current_user
        except Exception as e:
            print(f"Cloudinary profile picture upload error: {e}")
            # Fall back to local upload if Cloudinary fails
            return _save_profile_picture_locally(file, current_user, db)
    else:
        return _save_profile_picture_locally(file, current_user, db)

def _save_profile_picture_locally(file: UploadFile, current_user: models.User, db: Session):
    # Determine save path relative to backend dir
    BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads", "profile_pictures")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    filename = f"user_{current_user.id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Set relative URL path
        current_user.profile_picture = f"/uploads/profile_pictures/{filename}"
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Failed to save profile picture locally: {str(e)}")

@router.delete("/profile/picture", response_model=schemas.User)
def delete_profile_picture(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # If the user has a profile picture and it is saved locally, delete the physical file to prevent storage leaks
    if current_user.profile_picture and current_user.profile_picture.startswith("/uploads/profile_pictures/"):
        try:
            BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            filename = os.path.basename(current_user.profile_picture)
            file_path = os.path.join(BACKEND_DIR, "uploads", "profile_pictures", filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting local profile picture file: {e}")
            
    current_user.profile_picture = None
    db.commit()
    db.refresh(current_user)
    return current_user
