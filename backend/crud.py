from sqlalchemy.orm import Session
import bcrypt
import models, schemas

import os

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    # Default to 10 rounds on resource-constrained environments (like free tier)
    rounds = int(os.getenv("BCRYPT_ROUNDS", "10"))
    salt = bcrypt.gensalt(rounds=rounds)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_google_user(db: Session, email: str, name: str):
    db_user = models.User(name=name, email=email, hashed_password=None)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
