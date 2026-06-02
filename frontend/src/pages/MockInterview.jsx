import React, { useState, useRef, useEffect } from 'react';
import { Mic, Video, VideoOff, MicOff, PhoneOff, User, Square, Circle, Crown, Zap, Star, X, Lock } from 'lucide-react';
import { recordingsApi } from '../services/api';

/* ─────────────────────────────────────────────
   Free-Plan Premium Upsell Modal
───────────────────────────────────────────── */
const PremiumModal = ({ onClose }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="premium-modal-title"
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    />

    {/* Modal Card */}
    <div className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
      {/* Gradient top bar */}
      <div className="h-2 w-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600" />

      {/* Dark glass body */}
      <div className="bg-slate-900/95 border border-white/10 rounded-b-3xl p-8 flex flex-col items-center text-center gap-6">

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close premium dialog"
          className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 blur-2xl rounded-full bg-gradient-to-br from-yellow-400/40 to-purple-500/40" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-xl">
            <Lock className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h2
            id="premium-modal-title"
            className="text-2xl font-extrabold text-white tracking-tight"
          >
            Your Free Plan is Over
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            You've used all&nbsp;<span className="font-bold text-white">3 free mock interviews</span>.
            Unlock unlimited sessions, advanced AI coaching&nbsp;&amp; more with&nbsp;Premium!
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-1 gap-2 w-full text-left">
          {[
            { icon: Zap,   color: 'text-yellow-400', label: 'Unlimited mock interview recordings' },
            { icon: Star,  color: 'text-pink-400',   label: 'Priority AI feedback & coaching' },
            { icon: Crown, color: 'text-purple-400', label: 'Advanced video presence analysis' },
          ].map(({ icon: Icon, color, label }) => (
            <div key={label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Icon className={`w-4 h-4 shrink-0 ${color}`} />
              <span className="text-sm text-slate-200">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="w-full py-4 rounded-2xl font-bold text-white text-base
            bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600
            hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]
            active:scale-95 transition-all"
        >
          ✨ Get Premium — Better Experience
        </button>

        <p className="text-xs text-slate-500">Cancel anytime · No hidden fees</p>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Main MockInterview Page
───────────────────────────────────────────── */
const MockInterview = () => {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState('');

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Free-plan gate
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(false);
  const [recordingsCount, setRecordingsCount] = useState(0);

  const FREE_LIMIT = 3;

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Check free-plan limit on mount to block early
  useEffect(() => {
    const fetchLimit = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const recordings = await recordingsApi.getMyRecordings(token);
          if (recordings) {
            setRecordingsCount(recordings.length);
            if (recordings.length >= FREE_LIMIT) {
              setShowPremiumModal(true);
            }
          }
        } catch (err) {
          console.warn('Could not check recording count on mount:', err);
        }
      }
    };
    fetchLimit();
  }, []);

  /* ── Check recording count before starting ── */
  const handleStartInterview = async () => {
    if (!interviewQuestion.trim()) {
      alert('Please enter a question first.');
      return;
    }

    if (recordingsCount >= FREE_LIMIT) {
      setShowPremiumModal(true);
      return;
    }

    // Check free-plan limit again to be sure
    setCheckingLimit(true);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const recordings = await recordingsApi.getMyRecordings(token);
        setRecordingsCount(recordings.length);
        if (recordings.length >= FREE_LIMIT) {
          setShowPremiumModal(true);
          setCheckingLimit(false);
          return;
        }
      }
    } catch (err) {
      // If error occurs, fail-safe block if we already think count is over
      if (recordingsCount >= FREE_LIMIT) {
        setShowPremiumModal(true);
        setCheckingLimit(false);
        return;
      }
      console.warn('Could not check recording count:', err);
    } finally {
      setCheckingLimit(false);
    }

    // Under the limit — request camera/mic and start
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      setIsInterviewStarted(true);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Please allow camera and microphone access to start the interview.');
      alert('Camera or Microphone access blocked. Please remove the block to continue.');
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOn]);

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => { track.enabled = !isVideoOn; });
      setIsVideoOn(prev => !prev);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => { track.enabled = !isMicOn; });
      setIsMicOn(prev => !prev);
    }
  };

  const handleStartRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      try {
        const token = localStorage.getItem('token');
        if (!token) { alert("You must be logged in to save recordings."); return; }
        await recordingsApi.uploadRecording(blob, interviewQuestion, token);
        alert("Recording uploaded successfully! Check 'My Recordings'.");
      } catch (err) {
        console.error('Failed to upload recording:', err);
        alert('Failed to upload recording to cloud.');
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
    if (isRecording) handleStopRecording();
    if (stream) stream.getTracks().forEach(track => track.stop());
    setIsInterviewStarted(false);
    setStream(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  /* ── Setup screen ── */
  if (!isInterviewStarted) {
    return (
      <>
        {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}

        <div className="min-h-[calc(100vh-6rem)] py-6 flex items-center justify-center p-4">
          <div className="glass-card p-6 md:p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Start Mock Interview</h2>
            <div className="flex flex-col gap-4">
              <label htmlFor="interview-question" className="text-sm text-slate-300 font-medium">
                Enter a topic or question to practice:
              </label>
              <textarea
                id="interview-question"
                value={interviewQuestion}
                onChange={(e) => setInterviewQuestion(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 min-h-[120px]"
                placeholder="e.g., Explain the concept of closure in JavaScript."
              />
              {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
              <button
                onClick={handleStartInterview}
                disabled={checkingLimit}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all mt-4 disabled:opacity-60 disabled:cursor-wait"
              >
                {checkingLimit ? 'Checking plan…' : 'Start Interview'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Active interview screen ── */
  return (
    <div className="min-h-[calc(100vh-6rem)] py-6 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-5xl h-full min-h-[450px] glass-card relative overflow-hidden bg-slate-900 rounded-3xl shadow-2xl">

        {/* Video / avatar */}
        {!isVideoOn ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center shadow-lg">
              <User className="w-16 h-16 text-slate-500" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="Your live camera feed"
            className="absolute inset-0 w-full h-full object-cover mirror"
          />
        )}

        {/* Name tag + REC indicator */}
        <div className="absolute top-6 left-6 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-md text-white font-medium shadow-lg flex items-center gap-2 z-10">
          You {isRecording && (
            <span className="text-red-500 animate-pulse font-bold flex items-center gap-1">
              <Circle className="w-3 h-3" fill="currentColor" aria-hidden="true" /> REC
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10 w-max max-w-[95vw] justify-center">

          {/* Record / Stop */}
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              aria-label="Start recording"
              title="Start Recording"
              className="p-4 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur-md transition-all shadow-xl hover:scale-105"
            >
              <Circle className="w-6 h-6 text-red-500" fill="currentColor" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              aria-label="Stop recording"
              title="Stop Recording"
              className="p-4 rounded-full bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-xl hover:scale-105"
            >
              <Square className="w-6 h-6" fill="currentColor" aria-hidden="true" />
            </button>
          )}

          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            title={isMicOn ? 'Mute' : 'Unmute'}
            className={`p-4 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-105 ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}
          >
            {isMicOn ? <Mic className="w-6 h-6" aria-hidden="true" /> : <MicOff className="w-6 h-6" aria-hidden="true" />}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            className={`p-4 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-105 ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}
          >
            {isVideoOn ? <Video className="w-6 h-6" aria-hidden="true" /> : <VideoOff className="w-6 h-6" aria-hidden="true" />}
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            aria-label="End interview session"
            title="End Call"
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white backdrop-blur-md transition-all shadow-xl hover:scale-105"
          >
            <PhoneOff className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockInterview;
