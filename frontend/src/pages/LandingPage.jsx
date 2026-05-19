import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BrainCircuit, Target, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 flex flex-col items-start gap-4"
  >
    <div className="p-3 rounded-lg bg-primary/20 text-primary">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-bold text-white tracking-wide">AI Interview Preparation Platform</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-full hover:bg-white/10 text-white font-medium transition-all"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium backdrop-blur-md transition-all"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 z-10 mt-12 md:mt-24 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>The future of interview preparation</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1]">
            Master your next interview with <span className="text-gradient">AI precision</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload your resume, engage in realistic AI-driven mock interviews, and get instant personalized feedback to land your dream job.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <button 
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all flex items-center justify-center gap-2"
            >
              Start for free <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mt-32" id="features">
          <FeatureCard 
            icon={BrainCircuit}
            title="Smart Resume Analysis"
            description="Our AI reads your resume and tailors interview questions specifically to your background and experience level."
          />
          <FeatureCard 
            icon={Video}
            title="Realistic Mock Interviews"
            description="Experience lifelike text and voice interviews with our advanced AI that adapts to your responses in real-time."
          />
          <FeatureCard 
            icon={Target}
            title="Actionable Analytics"
            description="Get detailed breakdowns of your performance, identify weak areas, and receive actionable tips to improve."
          />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
