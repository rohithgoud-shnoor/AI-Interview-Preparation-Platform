import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Download, 
  Brain, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Award, 
  Star, 
  HelpCircle, 
  CornerDownRight 
} from 'lucide-react';
import { resumeApi } from '../services/api';

const ResumeUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [status, setStatus] = useState('loading'); // loading, idle, uploading, actions, interview, feedback
  
  // Q&A and Feedback state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loaderMessage, setLoaderMessage] = useState('');

  const token = localStorage.getItem('token');

  // Check if resume is already uploaded on load
  useEffect(() => {
    const checkResumeStatus = async () => {
      if (!token) {
        setStatus('idle');
        return;
      }
      try {
        const res = await resumeApi.getStatus(token);
        if (res.has_resume) {
          setFilename(res.filename);
          // Load preview blob
          await loadPreviewBlob();
          setStatus('actions');
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error('Error checking resume status:', err);
        setStatus('idle');
      }
    };
    checkResumeStatus();
  }, [token]);

  // Clean up Object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadPreviewBlob = async () => {
    try {
      setPreviewError('');
      const blob = await resumeApi.getPreviewBlob(token);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error loading preview blob:', err);
      setPreviewError(err.message || 'Failed to load preview.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (selectedFile) => {
    setFile(selectedFile);
    setStatus('uploading');
    setErrorMessage('');
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await resumeApi.upload(formData, token);
      setFilename(selectedFile.name);
      await loadPreviewBlob();
      setStatus('actions');
    } catch (err) {
      console.error('Error uploading file:', err);
      setErrorMessage(err.message || 'Failed to upload resume. Please try again.');
      setStatus('idle');
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = filename || 'resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateQuestions = async () => {
    setStatus('loading');
    setLoaderMessage('AI is analyzing your resume to generate tailored interview questions...');
    setErrorMessage('');
    try {
      const data = await resumeApi.generateQuestions(token);
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(''));
      setCurrentQuestionIndex(0);
      setCurrentAnswer('');
      setStatus('interview');
    } catch (err) {
      console.error('Error generating questions:', err);
      setErrorMessage(err.message || 'Failed to generate questions. Please try again.');
      setStatus('actions');
    }
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = currentAnswer;
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer(answers[currentQuestionIndex + 1] || '');
    } else {
      // Completed last question -> Submit for feedback
      handleSubmitAllAnswers(updatedAnswers);
    }
  };

  const handleBackQuestion = () => {
    if (currentQuestionIndex > 0) {
      const updatedAnswers = [...answers];
      updatedAnswers[currentQuestionIndex] = currentAnswer;
      setAnswers(updatedAnswers);

      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setCurrentAnswer(answers[currentQuestionIndex - 1] || '');
    }
  };

  const handleSubmitAllAnswers = async (finalAnswers) => {
    setStatus('loading');
    setLoaderMessage('AI is reviewing your answers and preparing detailed feedback...');
    setErrorMessage('');
    try {
      const data = await resumeApi.submitFeedback(questions, finalAnswers, token);
      setFeedback(data);
      if (data && data.overall_score !== undefined) {
        localStorage.setItem('resume_match_score', data.overall_score);
        localStorage.setItem('resume_questions_attempted', questions.length || 10);
      }
      setStatus('feedback');
    } catch (err) {
      console.error('Error getting feedback:', err);
      setErrorMessage(err.message || 'Failed to analyze answers. Please try again.');
      setStatus('interview');
    }
  };

  const handleReset = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setFeedback(null);
    setErrorMessage('');
    setStatus('actions');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          AI Resume Interviewer
        </h1>
        <p className="text-slate-400 mt-2">
          Upload your resume, preview it, and let our AI interview you based on your background.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* PHASE 1: Loading State */}
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-lg font-medium text-white max-w-md">
              {loaderMessage || 'Connecting to server...'}
            </p>
          </motion.div>
        )}

        {/* PHASE 2: Upload Resume Form */}
        {status === 'idle' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`glass-card p-12 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all duration-300
              ${dragActive ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 border border-white/5">
              <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Drag & Drop your resume here</h3>
            <p className="text-slate-400 mb-6">Supports PDF, DOCX, and TXT up to 10MB</p>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleChange}
            />
            <label
              htmlFor="file-upload"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium cursor-pointer hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all"
            >
              Browse Files
            </label>
          </motion.div>
        )}

        {/* PHASE 3: Uploading State */}
        {status === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">Uploading and processing resume...</p>
          </motion.div>
        )}

        {/* PHASE 4: Resume Actions & Preview */}
        {status === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Action Bar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-base font-semibold text-white truncate" title={filename}>
                      {filename}
                    </h4>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Resume Ready
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={!previewUrl}
                    className={`w-full py-3 px-4 rounded-xl font-medium border transition-colors flex items-center justify-center gap-2 ${
                      previewUrl 
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' 
                        : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-4.5 h-4.5" /> Download Resume
                  </button>

                  <button
                    onClick={handleGenerateQuestions}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2 group"
                  >
                    Generate Questions
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="relative my-2 flex items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-3 text-slate-500 text-xs uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <input
                    type="file"
                    id="re-upload"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleChange}
                  />
                  <label
                    htmlFor="re-upload"
                    className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white font-medium cursor-pointer text-center text-sm transition-all"
                  >
                    Upload Different Resume
                  </label>
                </div>
              </div>
            </div>

            {/* In-Tab Live PDF Preview */}
            <div className="lg:col-span-8">
              <div className="glass-card p-4 h-[650px] flex flex-col border border-white/10">
                <div className="flex justify-between items-center mb-3 px-2">
                  <h3 className="text-sm font-semibold text-slate-300">Resume Preview</h3>
                  <span className="text-xs text-slate-500">Live View</span>
                </div>
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full flex-1 rounded-xl bg-slate-900 border border-white/5"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="w-full flex-1 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center text-slate-500 p-4">
                    <AlertCircle className="w-10 h-10 mb-2" />
                    <p className="text-sm text-center">
                      {previewError 
                        ? previewError 
                        : (filename && (filename.toLowerCase().endsWith('.pdf') || filename.toLowerCase().endsWith('.txt')))
                        ? "Loading preview..." 
                        : "Preview not available for this file type."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* PHASE 5: Q&A Interview Panel */}
        {status === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto"
          >
            <div className="glass-card p-8 space-y-8 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Progress */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">
                  Question <strong className="text-primary text-base">{currentQuestionIndex + 1}</strong> of {questions.length}
                </span>
                <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300">
                  Interview Active
                </span>
              </div>

              {/* Question Screen */}
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-white leading-relaxed">
                  {questions[currentQuestionIndex]}
                </h3>
              </div>

              {/* Answer Input */}
              <form onSubmit={handleAnswerSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="resume-answer" className="text-sm font-medium text-slate-300">Your Answer</label>
                  <textarea
                    id="resume-answer"
                    required
                    rows={6}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your structured answer here... Try to include details from your experience, technical specs, or scenarios."
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all resize-none text-base leading-relaxed"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleBackQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={`px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-all flex items-center gap-2 ${
                      currentQuestionIndex === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center gap-2 group"
                  >
                    {currentQuestionIndex === questions.length - 1 ? (
                      <>
                        Finish & Submit <CheckCircle className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        Next Question <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* PHASE 6: Feedback Dashboard */}
        {status === 'feedback' && feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score card */}
              <div className="glass-card p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-[40px] rounded-full pointer-events-none" />
                <Award className="w-10 h-10 text-primary mb-3" />
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Overall Match Score</p>
                <h3 className="text-5xl font-black text-white mt-2">
                  {feedback.overall_score}<span className="text-primary text-3xl">%</span>
                </h3>
              </div>

              {/* Strengths card */}
              <div className="glass-card p-6 space-y-3 md:col-span-2 border-l-4 border-l-emerald-500">
                <h4 className="text-emerald-400 font-semibold text-sm flex items-center gap-2 uppercase tracking-wide">
                  <Star className="w-4 h-4" /> Key Strengths
                </h4>
                <ul className="space-y-2">
                  {feedback.strengths.map((str, idx) => (
                    <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Improvement areas */}
            <div className="glass-card p-6 space-y-3 border-l-4 border-l-amber-500">
              <h4 className="text-amber-400 font-semibold text-sm flex items-center gap-2 uppercase tracking-wide">
                <AlertCircle className="w-4 h-4" /> Focus Areas & Recommendations
              </h4>
              <ul className="space-y-2">
                {feedback.areas_for_improvement.map((imp, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                    <CornerDownRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Question breakdown */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white tracking-wide">Detailed Responses & Evaluation</h3>
              <div className="space-y-6">
                {feedback.question_breakdown.map((item, idx) => (
                  <div key={idx} className="glass-card p-6 space-y-4 border border-white/5">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-white font-medium text-base">
                        Q{item.question_number}: {item.question}
                      </h4>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                        item.score >= 8 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : item.score >= 5 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        Score: {item.score} / 10
                      </span>
                    </div>

                    {/* QA comparison */}
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-slate-400 font-medium block text-xs mb-1">Your Answer:</span>
                        <p className="text-white italic leading-relaxed">
                          {item.answer || <span className="text-slate-600">No answer provided.</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <span className="text-primary font-medium block text-xs mb-1 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" /> AI Feedback:
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {item.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleReset}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center gap-2 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Start New Interview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeUpload;
