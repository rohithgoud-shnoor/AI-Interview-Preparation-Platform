import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async (response) => {
    const token = response.credential;
    try {
      const res = await fetch('http://localhost:8000/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_name', data.name);
        navigate('/dashboard');
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Google sign-in failed');
      }
    } catch (error) {
      console.error('Error logging in with Google:', error);
      alert('Google login failed. Please try again.');
    }
  };

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID is not configured in .env file.");
      return;
    }

    const initGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLogin,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('googleBtn'),
          { theme: 'filled_black', size: 'large', width: '382', text: 'signin_with', shape: 'rectangular' }
        );
      } else {
        setTimeout(initGoogleSignIn, 100);
      }
    };

    initGoogleSignIn();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_name', data.name);
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Login failed');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Network error. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden items-center justify-center p-6">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Welcome Back</h2>
          <p className="text-slate-400 mt-2 text-center">Sign in to continue your interview preparation</p>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2 group"
            >
              Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-sm">or continue with</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Google Sign-in Button */}
          <div className="w-full flex justify-center mb-2">
            <div id="googleBtn" className="w-full"></div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-slate-400">
              New user?{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-1">
                Register here <UserPlus className="w-4 h-4" />
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
