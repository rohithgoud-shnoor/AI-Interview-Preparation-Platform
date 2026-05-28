from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import cloudinary
import cloudinary.uploader
from typing import List
import os
import shutil
import tempfile
import requests
import math
import json

import models, schemas, database
from routers.auth import get_current_user

def transcribe_audio_file(file_path: str) -> str:
    """
    Sends the audio/video file to Groq Whisper API for transcription,
    and returns a JSON string containing the formatted 30-second chunks.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY is not configured.")
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        with open(file_path, "rb") as f:
            files = {
                "file": (os.path.basename(file_path), f, "audio/webm")
            }
            data = {
                "model": "whisper-large-v3",
                "response_format": "verbose_json"
            }
            response = requests.post(url, headers=headers, files=files, data=data, timeout=60)
            
        if response.status_code != 200:
            raise Exception(f"Groq Whisper API returned status {response.status_code}: {response.text}")
            
        res_json = response.json()
        
        # Process segments into 30-second cards
        duration = res_json.get("duration", 0)
        segments = res_json.get("segments", [])
        
        if duration == 0 and segments:
            duration = segments[-1].get("end", 0)
            
        num_chunks = max(1, math.ceil(duration / 30.0))
        chunks = []
        
        for i in range(num_chunks):
            start_time = i * 30
            end_time = (i + 1) * 30
            
            start_str = f"{start_time // 60:02d}:{start_time % 60:02d}"
            end_str = f"{end_time // 60:02d}:{end_time % 60:02d}"
            
            chunks.append({
                "timestamp": f"{start_str} - {end_str}",
                "text": ""
            })
            
        for segment in segments:
            start = segment.get("start", 0)
            chunk_idx = min(int(start // 30), num_chunks - 1)
            text = segment.get("text", "").strip()
            if text:
                if chunks[chunk_idx]["text"]:
                    chunks[chunk_idx]["text"] += " " + text
                else:
                    chunks[chunk_idx]["text"] = text
                    
        # Fill in silence placeholders if any chunk text is empty
        for chunk in chunks:
            if not chunk["text"]:
                chunk["text"] = "(No speech detected)"
                
        return json.dumps(chunks)
    except Exception as e:
        print(f"Transcription error in transcribe_audio_file: {e}")
        raise e


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
        
        # Attempt transcription first by copying stream to a temp file
        transcript_json = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                shutil.copyfileobj(file.file, temp_file)
                temp_path = temp_file.name
            
            # Reset file pointer for Cloudinary upload
            file.file.seek(0)
            
            # Transcribe audio via Groq Whisper API
            transcript_json = transcribe_audio_file(temp_path)
            
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
        except Exception as te:
            print(f"Transcription during upload failed: {te}")
            # Ensure cleanup on failure
            if 'temp_path' in locals() and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
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
            created_at=datetime.utcnow().isoformat(),
            transcript=transcript_json
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

@router.get("/{recording_id}/transcript")
def get_recording_transcript(
    recording_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    recording = db.query(models.Recording).filter(
        models.Recording.id == recording_id,
        models.Recording.user_id == current_user.id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
        
    if recording.transcript:
        return json.loads(recording.transcript)
        
    # On-demand transcription fallback if transcript is missing
    try:
        # Download from Cloudinary
        video_response = requests.get(recording.video_url, stream=True)
        if video_response.status_code != 200:
            raise Exception(f"Failed to download video from Cloudinary: status {video_response.status_code}")
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            for chunk in video_response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
            temp_path = temp_file.name
            
        transcript_json = transcribe_audio_file(temp_path)
        
        # Clean up temp file
        try:
            os.unlink(temp_path)
        except:
            pass
            
        # Update database
        recording.transcript = transcript_json
        db.commit()
        db.refresh(recording)
        
        return json.loads(transcript_json)
    except Exception as e:
        print(f"On-demand transcription failed for recording {recording_id}: {e}")
        # Clean up temp file in case of error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to transcribe recording: {str(e)}"
        )

def _call_groq_with_retry(prompt: str, model: str, api_key: str, max_retries=3) -> str:
    """Call Groq API with automatic retry and exponential backoff for rate limits."""
    import time
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
                wait_time = 5 * (2 ** attempt)
                time.sleep(wait_time)
                from fastapi import status
                last_error = HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="The Groq AI is currently busy. Rate limit reached. Please wait about 30 seconds and try again."
                )
            else:
                raise Exception(f"Groq API error (status {response.status_code}): {response.text}")
        except Exception as e:
            last_error = e
            if not isinstance(e, requests.RequestException) and "429" not in str(e):
                raise HTTPException(
                    status_code=500,
                    detail=f"Groq API failure: {str(e)}"
                )
    
    if isinstance(last_error, HTTPException):
        raise last_error
    raise HTTPException(
        status_code=500,
        detail=f"Groq API call failed after multiple attempts: {str(last_error)}"
    )

@router.post("/{recording_id}/analyze")
def analyze_recording_transcript(
    recording_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    recording = db.query(models.Recording).filter(
        models.Recording.id == recording_id,
        models.Recording.user_id == current_user.id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
        
    if recording.ai_analysis:
        return json.loads(recording.ai_analysis)
        
    if not recording.transcript:
        # Fallback to on-demand transcription first if transcript is empty/missing
        try:
            get_recording_transcript(recording_id, db, current_user)
            # Re-fetch recording to get the newly generated transcript
            db.refresh(recording)
        except Exception as te:
            raise HTTPException(
                status_code=400,
                detail=f"No transcript exists, and on-demand transcription failed: {str(te)}"
            )
            
    if not recording.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty or unavailable.")
        
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Groq API Key is not configured on the server."
        )
        
    try:
        groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        chunks = json.loads(recording.transcript)
        chunks_text = "\n".join([f"[{chunk['timestamp']}] {chunk['text']}" for chunk in chunks])
        
        prompt = f"""
        You are an expert communications coach and interviewer.
        Analyze the following transcript chunks from a candidate's spoken response to the interview question: "{recording.question}".

        Original response chunks:
        ---
        {chunks_text}
        ---

        Please perform the following tasks:
        1. For each 30-second chunk:
           - Enhance grammar, clarity, sentence structure, and professional communication.
           - Preserve the candidate's original intent, key points, and technical details.
           - Display the improved response for each original chunk so they can be matched and displayed side-by-side.
        2. Identify and analyze filler words (e.g. "um", "uh", "like", "so", "you know", "actually") in the candidate's speech. Provide a breakdown of counts and construct actionable feedback for reducing filler words.
        3. Extract specific grammar issues found (if any), detailing the original phrasing, the corrected phrasing, and an explanation of the grammar rule/correction.
        4. Provide general overall professional suggestions to make the response sound more authoritative, structured, and polished.
        5. Analyze the candidate's response in relation to the interview question topic. Identify any missing key concepts, points, technologies, or details that are industry standards or expected details for this question that the candidate should have covered.

        Return the output STRICTLY in JSON format matching this schema:
        {{
          "analysis": [
            {{
              "timestamp": "00:00 - 00:30",
              "original_text": "original text here...",
              "improved_text": "improved text here..."
            }}
          ],
          "filler_words": {{
            "total_count": 5,
            "details": [
              {{ "word": "like", "count": 3 }},
              {{ "word": "um", "count": 2 }}
            ],
            "feedback": "Try to slow down your speech rate or pause when searching for words."
          }},
          "grammar_corrections": [
            {{
              "original": "original grammatically incorrect sentence...",
              "corrected": "corrected sentence...",
              "explanation": "explanation of correction..."
            }}
          ],
          "overall_suggestions": [
            "overall suggestion 1...",
            "overall suggestion 2..."
          ],
          "missing_points": [
            "missing point 1...",
            "missing point 2..."
          ]
        }}
        Ensure the array of analysis has exactly the same timestamps and same number of entries as the input.
        Do not output any introductory or concluding text, only valid JSON.
        """

        response_text = _call_groq_with_retry(prompt, groq_model, api_key)
        data = json.loads(response_text)
        
        if "analysis" not in data:
            raise ValueError("Invalid analysis structure generated by AI.")
            
        # Ensure new schema fields exist, even if AI didn't provide them
        if "filler_words" not in data:
            data["filler_words"] = {"total_count": 0, "details": [], "feedback": "No significant filler word usage detected."}
        if "grammar_corrections" not in data:
            data["grammar_corrections"] = []
        if "overall_suggestions" not in data:
            data["overall_suggestions"] = ["Good response. Try practice pacing your delivery."]
        if "missing_points" not in data:
            data["missing_points"] = []

        # Save the full enriched object back to database
        recording.ai_analysis = json.dumps(data)
        db.commit()
        db.refresh(recording)
        
        return data
    except Exception as e:
        print(f"AI Analysis failed for recording {recording_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate AI analysis: {str(e)}"
        )


