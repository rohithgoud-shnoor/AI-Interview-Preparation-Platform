from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, LargeBinary
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    phone_number = Column(String, nullable=True)
    college_name = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    filename = Column(String)
    filepath = Column(String)
    extracted_text = Column(Text, nullable=True)
    file_content = Column(LargeBinary, nullable=True)

class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question = Column(String)
    video_url = Column(String)
    created_at = Column(String)
    transcript = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    video_analysis = Column(Text, nullable=True)


