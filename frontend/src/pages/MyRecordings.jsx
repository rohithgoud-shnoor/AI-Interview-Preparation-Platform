import React, { useEffect, useState } from 'react';
import { recordingsApi } from '../services/api';
import { Video, Calendar, X, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';

const MyRecordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Transcript states
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [transcriptChunks, setTranscriptChunks] = useState([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');

  const fetchRecordings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await recordingsApi.getMyRecordings(token);
      // Sort by timestamp descending if not already sorted
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecordings(data);
    } catch (err) {
      console.error("Error fetching recordings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleOpenTranscript = async (rec) => {
    setSelectedRecording(rec);
    setLoadingTranscript(true);
    setTranscriptChunks([]);
    setTranscriptError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTranscriptError("You must be logged in to view transcripts.");
        return;
      }
      const chunks = await recordingsApi.getTranscript(rec.id, token);
      setTranscriptChunks(chunks);
    } catch (err) {
      console.error("Failed to load transcript:", err);
      setTranscriptError(err.message || "Failed to load or generate transcript.");
    } finally {
      setLoadingTranscript(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <div className="text-primary animate-pulse flex flex-col items-center gap-2">
          <Video className="w-8 h-8" />
          <span>Loading recordings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">My Recordings</h1>
          <p className="text-slate-400 text-sm">Review your past interview sessions</p>
        </div>
      </div>

      {recordings.length === 0 ? (
        <div className="glass-card flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Video className="w-16 h-16 opacity-50" />
          <p>No recordings found. Start a Mock Interview to record a session!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
          {recordings.map((rec) => (
            <div key={rec.id} className="glass-card overflow-hidden flex flex-col group">
              <div className="aspect-video bg-slate-900 relative">
                <video 
                  src={rec.video_url} 
                  controls 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <h3 className="font-semibold text-white line-clamp-2" title={rec.question}>
                  {rec.question}
                </h3>
                <div className="flex items-center justify-between gap-4 mt-auto pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => handleOpenTranscript(rec)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 border border-primary/20 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Transcript
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transcript Modal Overlay */}
      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/10 bg-slate-900/95 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-lg font-bold text-white">Interview Transcript</h2>
              </div>
              <button 
                onClick={() => setSelectedRecording(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Question info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">Interview Question</p>
                <p className="text-white font-medium">{selectedRecording.question}</p>
              </div>

              {/* Loading State */}
              {loadingTranscript && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div className="text-center">
                    <p className="text-white font-medium">Transcribing recording...</p>
                    <p className="text-slate-400 text-xs mt-1">This might take a few seconds as the AI parses the video audio.</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {transcriptError && (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-red-500/10 border border-red-500/20 rounded-xl gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <div className="text-center">
                    <p className="text-red-400 font-medium">Failed to load transcript</p>
                    <p className="text-slate-400 text-xs mt-1">{transcriptError}</p>
                  </div>
                  <button 
                    onClick={() => handleOpenTranscript(selectedRecording)}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-xs transition-colors mt-2"
                  >
                    Retry Transcription
                  </button>
                </div>
              )}

              {/* Transcript Chunks list */}
              {!loadingTranscript && !transcriptError && (
                <div className="space-y-4">
                  {transcriptChunks.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No transcript chunks available.</p>
                  ) : (
                    transcriptChunks.map((chunk, index) => (
                      <div 
                        key={index} 
                        className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col gap-2 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20">
                            {chunk.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {chunk.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-950/40 flex justify-end">
              <button 
                onClick={() => setSelectedRecording(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecordings;
