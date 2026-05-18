import React, { useState } from 'react';
import { Mic, Video, VideoOff, MicOff, Send, PhoneOff, Settings, User } from 'lucide-react';

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
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [input, setInput] = useState('');

  const messages = [
    { text: "Hello! I'm your AI interviewer. Let's start with your background. Can you walk me through your experience with React?", isAi: true },
    { text: "Sure! I've been working with React for about 3 years. At my last company, I led the migration from class components to hooks and implemented a new state management system using Redux Toolkit.", isAi: false },
    { text: "That sounds like a great initiative. What were some of the challenges you faced during that migration, and how did you overcome them?", isAi: true },
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6">
      {/* Video Section */}
      <div className="lg:w-1/2 flex flex-col gap-4 h-full">
        <div className="glass-card flex-1 relative overflow-hidden group">
          {/* AI Avatar Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-primary/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping opacity-50" />
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_50px_rgba(147,51,234,0.5)]">
                <span className="text-4xl font-bold text-white">AI</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-md bg-black/50 backdrop-blur-md text-white text-sm font-medium">
            Interviewer (AI)
          </div>
        </div>

        <div className="h-64 glass-card relative overflow-hidden bg-slate-900">
          {/* User Video Placeholder */}
          {!isVideoOn ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                <User className="w-10 h-10 text-slate-500" />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-800" />
          )}
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-md bg-black/50 backdrop-blur-md text-white text-sm font-medium">
            You
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button 
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3 rounded-full backdrop-blur-md transition-colors ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-3 rounded-full backdrop-blur-md transition-colors ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors ml-2">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Section */}
      <div className="lg:w-1/2 glass-card flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-semibold text-white">Live Transcript</h3>
          <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
            <button className="p-3 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockInterview;
