import os
import shutil
import json
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from pypdf import PdfReader
import docx
import requests

import models, database
from routers.auth import get_current_user

def _call_groq_with_retry(prompt: str, model: str, api_key: str, max_retries=3) -> str:
    """Call Groq API with automatic retry and exponential backoff for rate limits."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "response_format": {"type": "json_object"}
    }
    
    last_error = None
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                res_json = response.json()
                return res_json["choices"][0]["message"]["content"]
            elif response.status_code == 429:
                # Exponential backoff: 5s, 10s, 20s
                wait_time = 5 * (2 ** attempt)
                time.sleep(wait_time)
                last_error = HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="The Groq AI is currently busy. Rate limit reached after multiple retries. Please wait about 30 seconds and try again."
                )
            else:
                raise Exception(f"Groq API error (status {response.status_code}): {response.text}")
        except Exception as e:
            last_error = e
            # If it's a request exception (connection error, etc.), retry
            # If it's a non-rate-limit HTTP error, don't retry and just raise
            if not isinstance(e, requests.RequestException) and "429" not in str(e):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Groq API failure: {str(e)}"
                )
    
    if isinstance(last_error, HTTPException):
        raise last_error
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Groq API call failed after multiple attempts: {str(last_error)}"
    )

router = APIRouter(prefix="/api/resume", tags=["resume"])

# Define UPLOAD_DIR relative to backend package root, not current working directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_safe_basename(path: str) -> str:
    # Replace backslashes with forward slashes to handle Windows paths on Linux
    normalized_path = path.replace("\\", "/")
    return os.path.basename(normalized_path)

# Helper function to extract text from PDF
def extract_text_from_pdf(file_path: str) -> str:
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse PDF file: {str(e)}"
        )

# Helper function to extract text from DOCX
def extract_text_from_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return "\n".join(text).strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse DOCX file: {str(e)}"
        )

# Helper function to extract text from TXT
def extract_text_from_txt(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read().strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse TXT file: {str(e)}"
        )

# Request schema for feedback
class FeedbackRequest(BaseModel):
    questions: List[str]
    answers: List[str]

@router.post("/upload")
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PDF, DOCX, or TXT file."
        )

    # Generate unique filename to avoid collision
    filename = f"user_{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Read file content bytes for database storage
    try:
        file.file.seek(0)
        file_content_bytes = file.file.read()
        file.file.seek(0)  # Reset pointer for subsequent read if needed
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file contents: {str(e)}"
        )

    # Save file locally
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Extract text content
    extracted_text = ""
    if file_ext == ".pdf":
        extracted_text = extract_text_from_pdf(file_path)
    elif file_ext in [".docx", ".doc"]:
        extracted_text = extract_text_from_docx(file_path)
    elif file_ext == ".txt":
        extracted_text = extract_text_from_txt(file_path)

    if not extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract text content from the file. The file may be empty or encrypted."
        )

    # Save to Database
    db_resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    if db_resume:
        # Resolve the old path safely
        old_filename = get_safe_basename(db_resume.filepath)
        old_filepath = os.path.join(UPLOAD_DIR, old_filename)
        # Delete old file if path changed and it exists
        if old_filepath != file_path and os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except Exception:
                pass
        db_resume.filename = file.filename
        db_resume.filepath = file_path
        db_resume.extracted_text = extracted_text
        db_resume.file_content = file_content_bytes
    else:
        db_resume = models.Resume(
            user_id=current_user.id,
            filename=file.filename,
            filepath=file_path,
            extracted_text=extracted_text,
            file_content=file_content_bytes
        )
        db.add(db_resume)

    try:
        db.commit()
        db.refresh(db_resume)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    return {
        "message": "Resume uploaded and processed successfully.",
        "filename": db_resume.filename,
        "status": "complete"
    }

@router.get("/status")
def get_resume_status(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    if not db_resume:
        return {"has_resume": False}
    
    return {
        "has_resume": True,
        "filename": db_resume.filename,
        "filepath": db_resume.filepath
    }

@router.get("/preview")
def preview_resume(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    if not db_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload your resume first."
        )

    # Resolve path relative to current UPLOAD_DIR
    filename_on_disk = get_safe_basename(db_resume.filepath)
    resolved_path = os.path.join(UPLOAD_DIR, filename_on_disk)

    # Detect Content-Type
    media_type = "application/octet-stream"
    if db_resume.filename.lower().endswith(".pdf"):
        media_type = "application/pdf"
    elif db_resume.filename.lower().endswith(".txt"):
        media_type = "text/plain"

    # Try serving from local disk first
    if os.path.exists(resolved_path):
        return FileResponse(
            resolved_path,
            media_type=media_type,
            filename=db_resume.filename
        )
    # Fallback to serving bytes from database
    elif db_resume.file_content is not None:
        return Response(
            content=db_resume.file_content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"inline; filename={db_resume.filename}"
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on the server. Please re-upload your resume."
        )

@router.post("/generate-questions")
def generate_questions(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    if not db_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload your resume first."
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Groq API Key is not configured on the server."
        )

    try:
        groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        prompt = f"""
        You are an expert technical interviewer. 
        Analyze this resume text:
        ---
        {db_resume.extracted_text}
        ---
        Generate exactly 10 interview questions tailored to this candidate.
        Cover technical capabilities, problem solving, past projects, certifications, and experience mentioned.
        Return the output STRICTLY in JSON format matching this schema:
        {{
          "questions": ["Question 1 text...", "Question 2 text...", ...]
        }}
        Do not output any introductory or concluding text, only valid JSON.
        """

        response_text = _call_groq_with_retry(prompt, groq_model, api_key)
        
        data = json.loads(response_text)
        if "questions" not in data or len(data["questions"]) != 10:
            raise ValueError("Invalid number of questions generated.")
            
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )

@router.post("/feedback")
def get_feedback(
    request_data: FeedbackRequest,
    current_user: models.User = Depends(get_current_user)
):
    if len(request_data.questions) != len(request_data.answers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number of questions and answers must match."
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Groq API Key is not configured on the server."
        )

    # Format the QA block
    qa_list = []
    for idx, (q, a) in enumerate(zip(request_data.questions, request_data.answers)):
        qa_list.append(f"Q{idx+1}: {q}\nCandidate Answer: {a}\n")
    qa_formatted = "\n".join(qa_list)

    try:
        groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        prompt = f"""
        You are an expert technical interviewer evaluating a candidate's responses to 10 resume-tailored questions.
        Here are the questions and candidate's answers:
        ---
        {qa_formatted}
        ---
        Evaluate their responses. Be constructive, technical, and detailed.
        Provide:
        1. An overall score (percentage, 0-100).
        2. Top 3 strengths identified from their answers.
        3. Top 3 areas of improvement.
        4. A question-by-question breakdown, including:
           - The original question text.
           - The candidate's answer.
           - A score (1-10) for that answer.
           - Detailed constructive feedback explaining what was good and how to improve.

        Return the output STRICTLY in JSON format matching this schema:
        {{
          "overall_score": 85,
          "strengths": ["strength1", "strength2", "strength3"],
          "areas_for_improvement": ["improvement1", "improvement2", "improvement3"],
          "question_breakdown": [
            {{
              "question_number": 1,
              "question": "Question text...",
              "answer": "Answer text...",
              "score": 8,
              "feedback": "Feedback text..."
            }},
            ...
          ]
        }}
        Do not output any introductory or concluding text, only valid JSON.
        """

        response_text = _call_groq_with_retry(prompt, groq_model, api_key)
        
        data = json.loads(response_text)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate feedback: {str(e)}"
        )
