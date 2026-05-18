import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

const ResumeUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, complete

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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    setStatus('uploading');
    // Simulate upload and analysis
    setTimeout(() => setStatus('complete'), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Resume</h1>
        <p className="text-slate-400 mt-2">Upload your latest resume to get tailored interview questions.</p>
      </div>

      <div
        className={`glass-card p-12 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all duration-300
          ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-700 hover:border-slate-500'}
          ${status !== 'idle' ? 'hidden' : 'block'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
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
          className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer transition-colors"
        >
          Browse Files
        </label>
      </div>

      {status !== 'idle' && (
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-white">{file?.name || 'resume.pdf'}</h4>
                <p className="text-sm text-slate-400">{(file?.size / 1024 / 1024).toFixed(2) || '2.4'} MB</p>
              </div>
            </div>
            {status === 'complete' ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {status === 'complete' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h3 className="text-xl font-semibold text-white">Analysis Complete</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-emerald-400">Strengths Identified</h5>
                    <p className="text-sm text-slate-300 mt-1">Strong React background, excellent system design experience.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-400">Areas to Probe</h5>
                    <p className="text-sm text-slate-300 mt-1">Cloud deployment (AWS/GCP) experience needs clarification.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all">
                  Start Tailored Interview
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
