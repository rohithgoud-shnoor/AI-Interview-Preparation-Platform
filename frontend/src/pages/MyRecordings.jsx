import React, { useEffect, useState } from 'react';
import { recordingsApi } from '../services/api';
import { 
  Video, Calendar, MessageSquare, AlertCircle, Loader2, Sparkles, 
  AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Play, FileText
} from 'lucide-react';

const MyRecordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Active Recording state
  const [selectedRecording, setSelectedRecording] = useState(null);

  // Transcript states
  const [transcriptChunks, setTranscriptChunks] = useState([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');

  // AI Analysis states
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  
  // Specific toggled chunks for displaying inline AI comparisons
  const [expandedChunks, setExpandedChunks] = useState({});

  // Enriched AI Analysis metrics
  const [analysisChunks, setAnalysisChunks] = useState([]);
  const [fillerWords, setFillerWords] = useState(null);
  const [grammarCorrections, setGrammarCorrections] = useState([]);
  const [overallSuggestions, setOverallSuggestions] = useState([]);
  const [missingPoints, setMissingPoints] = useState([]);

  const fetchRecordings = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await recordingsApi.getMyRecordings(token);
      // Sort by timestamp descending
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecordings(data);
      
      // Auto-select the first recording
      if (data.length > 0) {
        handleSelectRecording(data[0]);
      }
    } catch (err) {
      console.error("Error fetching recordings:", err);
      setFetchError(err.message || "Failed to fetch recordings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleSelectRecording = async (rec) => {
    setSelectedRecording(rec);
    setLoadingTranscript(true);
    setTranscriptChunks([]);
    setTranscriptError('');
    setAnalysisChunks([]);
    setAnalysisError('');
    setExpandedChunks({});
    
    // Clear metrics
    setFillerWords(null);
    setGrammarCorrections([]);
    setOverallSuggestions([]);
    setMissingPoints([]);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTranscriptError("You must be logged in to view transcripts.");
        return;
      }
      const chunks = await recordingsApi.getTranscript(rec.id, token);
      setTranscriptChunks(chunks);

      // Pre-load analysis if it was already generated
      if (rec.ai_analysis) {
        try {
          const parsed = JSON.parse(rec.ai_analysis);
          if (parsed) {
            setAnalysisChunks(parsed.analysis || []);
            setFillerWords(parsed.filler_words || null);
            setGrammarCorrections(parsed.grammar_corrections || []);
            setOverallSuggestions(parsed.overall_suggestions || []);
            setMissingPoints(parsed.missing_points || []);
          }
        } catch (e) {
          console.error("Failed to parse cached analysis:", e);
        }
      }
    } catch (err) {
      console.error("Failed to load transcript:", err);
      setTranscriptError(err.message || "Failed to load transcript.");
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedRecording) return;
    setLoadingAnalysis(true);
    setAnalysisError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAnalysisError("You must be logged in to run analysis.");
        return;
      }
      const data = await recordingsApi.analyzeTranscript(selectedRecording.id, token);
      setAnalysisChunks(data.analysis || []);
      setFillerWords(data.filler_words || null);
      setGrammarCorrections(data.grammar_corrections || []);
      setOverallSuggestions(data.overall_suggestions || []);
      setMissingPoints(data.missing_points || []);

      // Cache analysis in local state list
      setRecordings(prev => prev.map(r => r.id === selectedRecording.id ? { ...r, ai_analysis: JSON.stringify(data) } : r));
    } catch (err) {
      console.error("Failed to analyze transcript:", err);
      setAnalysisError(err.message || "Failed to generate AI analysis.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const toggleChunkAnalysis = async (index) => {
    // If analysis is not loaded yet, run the analysis first
    if (analysisChunks.length === 0) {
      await handleRunAnalysis();
    }
    setExpandedChunks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <div className="text-primary animate-pulse flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span>Loading recordings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Recordings</h1>
            <p className="text-slate-400 text-sm">Review and analyze your interview practice sessions</p>
          </div>
        </div>
        {fetchError && (
          <button 
            onClick={fetchRecordings}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white transition-all active:scale-95 cursor-pointer"
          >
            Retry Loading
          </button>
        )}
      </div>

      {fetchError ? (
        <div className="glass-card flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
          <AlertCircle className="w-16 h-16 text-red-500/80 animate-bounce" />
          <p className="text-red-400 font-medium">{fetchError}</p>
        </div>
      ) : recordings.length === 0 ? (
        <div className="glass-card flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Video className="w-16 h-16 opacity-50" />
          <p>No recordings found. Start a Mock Interview to record a session!</p>
        </div>
      ) : (
        /* Main Responsive Split Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] overflow-hidden">
          
          {/* Left Panel: Scrollable Recording List Sidebar */}
          <div className="lg:col-span-3 h-full flex flex-col gap-4 overflow-y-auto pr-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
              Select Session ({recordings.length})
            </h3>
            <div className="space-y-3">
              {recordings.map((rec) => {
                const isActive = selectedRecording?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectRecording(rec)}
                    className={`glass-card overflow-hidden flex flex-col cursor-pointer transition-all border group hover:border-primary/40 ${
                      isActive 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-white/5 bg-slate-900/50 hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Tiny visual representation */}
                    <div className="aspect-video bg-slate-950 relative overflow-hidden">
                      <video src={rec.video_url} className="w-full h-full object-cover opacity-80" muted />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-white fill-white/20" />
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <h4 className="text-xs font-semibold text-white line-clamp-2" title={rec.question}>
                        {rec.question}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Workspace: Selected Video Details & AI Insights */}
          <div className="lg:col-span-9 h-full grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto lg:overflow-hidden pb-8 pr-1">
            
            {/* Center Area: Video Player & Youtube-like Comments/Transcript */}
            <div className="md:col-span-7 lg:h-full lg:overflow-y-auto flex flex-col gap-4">
              
              {/* Question Banner */}
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Active Topic Question</span>
                <h2 className="text-sm font-semibold text-white mt-1 leading-relaxed">{selectedRecording?.question}</h2>
              </div>

              {/* Video Frame */}
              <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/10 relative shadow-lg">
                <video 
                  src={selectedRecording?.video_url} 
                  controls 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Transcript Section (YouTube style) */}
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Transcript Cards
                  </h3>
                  {analysisChunks.length === 0 && !loadingAnalysis && (
                    <button
                      onClick={handleRunAnalysis}
                      disabled={loadingTranscript || !!transcriptError}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Analyze Full Response
                    </button>
                  )}
                </div>

                {loadingTranscript ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-slate-400 text-xs">Loading speech transcript...</p>
                  </div>
                ) : transcriptError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-red-400 text-xs font-medium">{transcriptError}</p>
                  </div>
                ) : transcriptChunks.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6">No transcript segments found.</p>
                ) : (
                  <div className="space-y-3">
                    {transcriptChunks.map((chunk, idx) => {
                      const isExpanded = !!expandedChunks[idx];
                      const improvedChunk = analysisChunks[idx];
                      
                      return (
                        <div 
                          key={idx} 
                          className="bg-slate-900/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 transition-all hover:border-white/10"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20">
                              {chunk.timestamp}
                            </span>
                            <button
                              onClick={() => toggleChunkAnalysis(idx)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all active:scale-95 cursor-pointer ${
                                isExpanded
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                              }`}
                            >
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              {isExpanded ? 'Hide AI Analysis' : 'AI Analysis'}
                            </button>
                          </div>

                          {/* Original Text */}
                          <p className="text-slate-300 text-xs leading-relaxed">
                            {chunk.text}
                          </p>

                          {/* Improved AI comparison section */}
                          {isExpanded && (
                            <div className="mt-2 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                              {loadingAnalysis ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                                  <span>Analyzing response...</span>
                                </div>
                              ) : improvedChunk ? (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg flex flex-col gap-1.5">
                                  <span className="text-[10px] font-semibold text-emerald-400 tracking-wide uppercase flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    AI Improved Phrasing
                                  </span>
                                  <p className="text-emerald-100 text-xs leading-relaxed">
                                    {improvedChunk.improved_text}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-red-400 text-xs">Failed to load improved comparison.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Area: AI Insights Sidebar */}
            <div className="md:col-span-5 lg:h-full lg:overflow-y-auto flex flex-col gap-4">
              <div className="border-b border-white/5 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  AI Communication Feedback
                </h3>
              </div>

              {loadingAnalysis ? (
                <div className="glass-card flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div>
                    <p className="text-white text-xs font-semibold">Running Speech Analytics...</p>
                    <p className="text-slate-400 text-[10px] mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Measuring filler words, analyzing grammatical mistakes, and listing key details you might have missed.
                    </p>
                  </div>
                </div>
              ) : analysisChunks.length === 0 ? (
                /* Unanalyzed State Call To Action */
                <div className="glass-card border border-dashed border-white/10 flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-4">
                  <BrainCircuit className="w-12 h-12 opacity-30 text-primary" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">No Analysis Available Yet</h4>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                      Analyze the full transcript to unlock visual metrics for filler words, grammar, missing topics, and suggestions.
                    </p>
                  </div>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={loadingTranscript || !!transcriptError}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Run AI Analysis
                  </button>
                </div>
              ) : (
                /* Analyzed Metrics Dashboard */
                <div className="space-y-4 pb-4 animate-in fade-in duration-300">
                  
                  {/* Filler Words Card */}
                  {fillerWords && (
                    <div className="glass-card border border-white/5 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Filler Words Tracker</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20">
                          {fillerWords.total_count} detected
                        </span>
                      </div>
                      
                      {fillerWords.details && fillerWords.details.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {fillerWords.details.map((detail, idx) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-white/5 border border-white/10 flex items-center gap-1.5"
                            >
                              <span className="font-semibold text-amber-400">"{detail.word}"</span>
                              <span className="text-[10px] text-slate-500">×{detail.count}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-400">Excellent speech patterns! No significant filler words detected.</p>
                      )}
                      
                      <p className="text-[11px] text-slate-400 leading-relaxed italic border-t border-white/5 pt-2">
                        {fillerWords.feedback}
                      </p>
                    </div>
                  )}

                  {/* Missing points covered card (User Request addition) */}
                  <div className="glass-card border border-red-500/15 bg-red-500/5 p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      Missing Topic Coverage
                    </h4>
                    
                    {missingPoints && missingPoints.length > 0 ? (
                      <ul className="space-y-2">
                        {missingPoints.map((pt, idx) => (
                          <li key={idx} className="text-[11px] text-red-200 leading-relaxed flex items-start gap-2">
                            <span className="text-red-400 font-bold mt-0.5">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-semibold">You covered all essential concepts for this topic!</span>
                      </div>
                    )}
                  </div>

                  {/* Suggestions Improvement Card */}
                  <div className="glass-card border border-white/5 p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                      Coaching & Delivery Tips
                    </h4>
                    <ul className="space-y-2">
                      {overallSuggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                          <span className="text-blue-400 font-bold mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Grammar Corrections Card */}
                  <div className="glass-card border border-white/5 p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Grammar Improvements</h4>
                    
                    {grammarCorrections && grammarCorrections.length > 0 ? (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {grammarCorrections.map((corr, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-2.5 border border-white/5 flex flex-col gap-1.5">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-red-400">Said:</span>
                              <span className="text-xs text-slate-300 line-through leading-tight">"{corr.original}"</span>
                            </div>
                            <div className="flex flex-col border-t border-white/5 pt-1.5">
                              <span className="text-[9px] uppercase font-bold text-emerald-400">Correction:</span>
                              <span className="text-xs text-emerald-100 font-medium leading-tight">"{corr.corrected}"</span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              {corr.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-400">No grammar corrections needed for this response!</p>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default MyRecordings;
