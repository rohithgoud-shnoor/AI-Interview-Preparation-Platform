import os
import shutil
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from pypdf import PdfReader
import docx
import google.generativeai as genai

import models, database
from routers.auth import get_current_user

router = APIRouter(prefix="/api/resume", tags=["resume"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

    # Save file locally
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
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
        # Delete old file if path changed
        if db_resume.filepath != file_path and os.path.exists(db_resume.filepath):
            try:
                os.remove(db_resume.filepath)
            except Exception:
                pass
        db_resume.filename = file.filename
        db_resume.filepath = file_path
        db_resume.extracted_text = extracted_text
    else:
        db_resume = models.Resume(
            user_id=current_user.id,
            filename=file.filename,
            filepath=file_path,
            extracted_text=extracted_text
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
    if not db_resume or not os.path.exists(db_resume.filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload your resume first."
        )

    # Detect Content-Type
    media_type = "application/octet-stream"
    if db_resume.filename.lower().endswith(".pdf"):
        media_type = "application/pdf"
    elif db_resume.filename.lower().endswith(".txt"):
        media_type = "text/plain"

    return FileResponse(
        db_resume.filepath,
        media_type=media_type,
        filename=db_resume.filename
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

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is not configured on the server."
        )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
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

        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        data = json.loads(response.text)
        if "questions" not in data or len(data["questions"]) != 10:
            # Fallback retry without JSON enforcement if parser failed
            # But the gemini model usually respects the JSON response_mime_type perfectly
            raise ValueError("Invalid number of questions generated.")
            
        return data
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

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is not configured on the server."
        )

    # Format the QA block
    qa_list = []
    for idx, (q, a) in enumerate(zip(request_data.questions, request_data.answers)):
        qa_list.append(f"Q{idx+1}: {q}\nCandidate Answer: {a}\n")
    qa_formatted = "\n".join(qa_list)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
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

        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        data = json.loads(response.text)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate feedback: {str(e)}"
        )
