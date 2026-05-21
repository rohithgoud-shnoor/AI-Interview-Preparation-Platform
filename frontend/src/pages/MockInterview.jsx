import React, { useState, useRef, useEffect } from 'react';
import { Mic, Video, VideoOff, MicOff, Send, PhoneOff, Settings, User, Play, Square, Circle } from 'lucide-react';
import { recordingsApi } from '../services/api';

const ChatMessage = ({ message }) => (
  <div className={`flex gap-4 ${message.isAi ? 'flex-row' : 'flex-row-reverse'} mb-6`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.isAi ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'}`}>
      {message.isAi ? <span className="font-bold">AI</span> : <User className="w-5 h-5" />}
    </div>
    <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${message.isAi ? 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm' : 'bg-primary text-white rounded-tr-sm'}`}>
      <p className="leading-relaxed">{message.text}</p>
    </div>
  </div>
);

const MockInterview = () => {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState('');
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [input, setInput] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const messages = [
    { text: "Hello! I'm your AI interviewer. Let's start with your background. Can you walk me through your experience with React?", isAi: true },
    { text: "Sure! I've been working with React for about 3 years. At my last company, I led the migration from class components to hooks and implemented a new state management system using Redux Toolkit.", isAi: false },
    { text: "That sounds like a great initiative. What were some of the challenges you faced during that migration, and how did you overcome them?", isAi: true },
  ];

  const handleStartInterview = async () => {
    if (!interviewQuestion.trim()) {
      alert("Please enter a question first.");
      return;
    }
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      setIsInterviewStarted(true);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg("Please allow camera and microphone access to start the interview.");
      alert("Camera or Microphone access blocked. Please remove the block to continue.");
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOn]);

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const handleStartRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert("You must be logged in to save recordings.");
          return;
        }
        await recordingsApi.uploadRecording(blob, interviewQuestion, token);
        alert("Recording uploaded successfully! Check 'My Recordings'.");
      } catch (err) {
        console.error("Failed to upload recording:", err);
        alert("Failed to upload recording to cloud.");
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleEndCall = () => {
    if (isRecording) {
      handleStopRecording();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsInterviewStarted(false);
    setStream(null);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  if (!isInterviewStarted) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="glass-card p-8 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Start Mock Interview</h2>
          <div className="flex flex-col gap-4">
            <label className="text-sm text-slate-300 font-medium">Enter a topic or question to practice:</label>
            <textarea 
              value={interviewQuestion}
              onChange={(e) => setInterviewQuestion(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 min-h-[120px]"
              placeholder="e.g., Explain the concept of closure in JavaScript."
            />
            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
            <button 
              onClick={handleStartInterview}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all mt-4"
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl h-full glass-card relative overflow-hidden bg-slate-900 rounded-3xl shadow-2xl">
        {/* User Video Placeholder */}
        {!isVideoOn ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center shadow-lg">
              <User className="w-16 h-16 text-slate-500" />
            </div>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover mirror"
          />
        )}
        <div className="absolute bottom-6 left-6 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-md text-white font-medium shadow-lg flex items-center gap-2">
          You {isRecording && <span className="text-red-500 animate-pulse font-bold flex items-center gap-1"><Circle className="w-3 h-3" fill="currentColor" /> REC</span>}
        </div>
        
        {/* Controls */}
        <div className="absolute bottom-6 right-6 flex items-center gap-4">
          {!isRecording ? (
            <button 
              onClick={handleStartRecording}
              title="Start Recording"
              className="p-4 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur-md transition-all shadow-xl hover:scale-105"
            >
              <Circle className="w-6 h-6 text-red-500" fill="currentColor" />
            </button>
          ) : (
            <button 
              onClick={handleStopRecording}
              title="Stop Recording"
              className="p-4 rounded-full bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-xl hover:scale-105"
            >
              <Square className="w-6 h-6" fill="currentColor" />
            </button>
          )}
          
          <button 
            onClick={toggleMic}
            className={`p-4 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-105 ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-105 ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockInterview;
