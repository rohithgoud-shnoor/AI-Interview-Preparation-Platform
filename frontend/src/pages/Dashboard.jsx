import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { authApi, recordingsApi, resumeApi } from '../services/api';
import { 
  Video, FileText, Award, Activity, Sparkles, Calendar, 
  ArrowRight, CheckCircle2, HelpCircle, AlertCircle, Play, Loader2, User
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon }) => (
  <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-[25px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-all" />
    <div className="flex justify-between items-start mb-3">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
          <Icon className="w-4.5 h-4.5" />
        </div>
      )}
    </div>
    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
    {subtitle && (
      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${subtitleColor}`}>
        {subtitle}
      </p>
    )}
  </div>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(localStorage.getItem('user_name') || 'Candidate');
  const [profilePicture, setProfilePicture] = useState('');
  
  // Real-time states
  const [recordings, setRecordings] = useState([]);
  const [hasResume, setHasResume] = useState(false);
  const [resumeFilename, setResumeFilename] = useState('');
  
  // Dynamic stats
  const [stats, setStats] = useState({
    interviewsTaken: 0,
    averageScore: 0,
    questionsAttempted: 0,
    resumeQA: 'N/A'
  });

  const [chartData, setChartData] = useState([]);
  const [recentInterviews, setRecentInterviews] = useState([]);

  // Helper to resolve profile picture url
  const getProfilePictureUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const backendBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:8000' 
      : 'https://ai-interview-preparation-platform-p5g3.onrender.com';
    return `${backendBaseUrl}${path}`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch User details
        const userData = await authApi.getMe(token);
        setName(userData.name);
        setProfilePicture(userData.profile_picture || '');
        localStorage.setItem('user_name', userData.name);

        // 2. Fetch Resume Upload Status
        const resumeStatus = await resumeApi.getStatus(token);
        setHasResume(resumeStatus.has_resume);
        if (resumeStatus.has_resume) {
          setResumeFilename(resumeStatus.filename);
        }

        // 3. Fetch recordings (Mock Interviews)
        const recList = await recordingsApi.getMyRecordings(token);
        setRecordings(recList);

        // Calculate dynamic stats
        const interviewsCount = recList.length;
        
        // Compute average score from analyzed recordings
        let scoreSum = 0;
        let analyzedCount = 0;
        let parsedChartPoints = [];

        // Process recordings in chronological order (oldest to newest) for chart
        const sortedRecList = [...recList].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        sortedRecList.forEach(rec => {
          if (rec.ai_analysis) {
            try {
              const parsedAnalysis = JSON.parse(rec.ai_analysis);
              let score = parsedAnalysis.overall_score;
              
              // Fallback calculation for existing videos that already have analysis
              if (score === undefined) {
                const fillerCount = parsedAnalysis.filler_words?.total_count || 0;
                const missingCount = parsedAnalysis.missing_points?.length || 0;
                score = Math.max(50, 95 - (fillerCount * 2) - (missingCount * 5));
              }

              scoreSum += score;
              analyzedCount++;

              // Format date for chart: e.g., "May 12"
              const dateObj = new Date(rec.created_at);
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              parsedChartPoints.push({
                name: formattedDate,
                score: score
              });
            } catch (e) {
              console.error("Error parsing ai_analysis for recording", rec.id, e);
            }
          }
        });

        const avgScore = analyzedCount > 0 ? Math.round(scoreSum / analyzedCount) : 0;
        
        // Fetch cached Resume feedback score
        const cachedResumeScore = localStorage.getItem('resume_match_score');
        const resumeQuestionsCount = parseInt(localStorage.getItem('resume_questions_attempted') || '0', 10);
        
        const totalQuestionsAttempted = interviewsCount + resumeQuestionsCount;

        setStats({
          interviewsTaken: interviewsCount,
          averageScore: avgScore,
          questionsAttempted: totalQuestionsAttempted,
          resumeQA: cachedResumeScore ? `${cachedResumeScore}%` : 'N/A'
        });

        setChartData(parsedChartPoints);

        // Set recent 4 recordings
        const recent4 = recList.slice(0, 4);
        setRecentInterviews(recent4);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <div className="text-primary animate-pulse flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span>Syncing real-time dashboard analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 blur-[40px] rounded-full pointer-events-none" />
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Hello, {name} <Sparkles className="w-5 h-5 text-primary" />
          </h2>
          <p className="text-slate-400 text-sm font-medium">Keep practicing and polish your communication & technical skills!</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Link 
            to="/dashboard/profile" 
            title="Go to Profile"
            className="w-10 h-10 rounded-full border-2 border-slate-700 hover:border-primary bg-slate-950 flex items-center justify-center overflow-hidden transition-all shadow-md shrink-0 aspect-square"
          >
            {profilePicture ? (
              <img 
                src={getProfilePictureUrl(profilePicture)} 
                alt="Profile" 
                className="w-full h-full object-cover object-center rounded-full shrink-0 select-none block"
              />
            ) : (
              <User className="w-5 h-5 text-slate-400 shrink-0" />
            )}
          </Link>
          
          <Link 
            to="/dashboard/interview"
            className="hidden md:flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold hover:shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all active:scale-95 cursor-pointer"
          >
            Start Practice
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Real-time Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Mock Interviews */}
        <StatCard 
          title="Mock Interviews" 
          value={stats.interviewsTaken} 
          subtitle="Recorded practice sessions" 
          subtitleColor="text-slate-400"
          icon={Video}
        />
        
        {/* Average Score */}
        <StatCard 
          title="Average Communication Score" 
          value={stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A'} 
          subtitle={stats.averageScore > 0 ? "Analyzed spoken sessions" : "No analyzed sessions yet"} 
          subtitleColor={stats.averageScore > 0 ? "text-emerald-400" : "text-slate-500"}
          icon={Award}
        />
        
        {/* Resume QA Score */}
        <StatCard 
          title="Resume Q&A Score" 
          value={stats.resumeQA} 
          subtitle={stats.resumeQA !== 'N/A' ? "Latest Q&A performance" : "Resume Q&A not attempted"} 
          subtitleColor={stats.resumeQA !== 'N/A' ? "text-emerald-400" : "text-slate-500"}
          icon={FileText}
        />
        
        {/* Resume Status */}
        <StatCard 
          title="Resume Status" 
          value={hasResume ? 'Uploaded' : 'Missing'} 
          subtitle={hasResume ? resumeFilename : "Go to Resume to upload"} 
          subtitleColor={hasResume ? "text-emerald-400 font-bold" : "text-amber-500"}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Overview Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Performance Overview</h3>
              <p className="text-xs text-slate-400 mt-1">Dynamic score trends mapped across your analyzed practice sessions</p>
            </div>
            {chartData.length > 1 && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dynamic Score Active
              </span>
            )}
          </div>

          <div className="h-[300px] w-full flex-1 flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    tick={{fill: '#64748b', fontSize: 11}} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{fill: '#64748b', fontSize: 11}} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                    dx={-10}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(value) => [`${value}%`, 'Communication Score']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#9333ea" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    activeDot={{ r: 6, fill: '#9333ea', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              /* Beautiful Placeholder Call to Action */
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-white/5 text-slate-500">
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">No Score Trend Data Yet</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Practice structured mock interviews, record them, and click **Analyze** in **My Recordings** to generate AI scores and view your real-time performance line chart!
                  </p>
                </div>
                <Link 
                  to="/dashboard/interview"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                >
                  Attempt Mock Interview
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Right Panel: Recent Mock Interviews */}
        <div className="glass-card p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white">Recent Attempts</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Real-time mock interview logs</p>
            </div>
            <Link 
              to="/dashboard/recordings" 
              className="text-xs font-semibold text-primary hover:text-secondary transition-colors"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-4 flex-1">
            {recentInterviews.length > 0 ? (
              recentInterviews.map((item, i) => {
                let score = 'Pending';
                let scoreColor = 'bg-slate-800 text-slate-400';
                
                if (item.ai_analysis) {
                  try {
                    const parsed = JSON.parse(item.ai_analysis);
                    let overallScore = parsed.overall_score;
                    if (overallScore === undefined) {
                      const fillerCount = parsed.filler_words?.total_count || 0;
                      const missingCount = parsed.missing_points?.length || 0;
                      overallScore = Math.max(50, 95 - (fillerCount * 2) - (missingCount * 5));
                    }
                    score = `${overallScore}%`;
                    scoreColor = overallScore >= 80 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : overallScore >= 60 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20';
                  } catch (e) {}
                }

                return (
                  <div key={i} className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl p-3 flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="text-xs font-semibold text-white line-clamp-1 leading-normal flex-1" title={item.question}>
                        {item.question}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${scoreColor}`}>
                        {score}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/[0.03] pt-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {score === 'Pending' ? (
                        <Link 
                          to="/dashboard/recordings"
                          className="text-[10px] font-bold text-primary hover:text-secondary flex items-center gap-0.5"
                        >
                          Analyze <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link 
                          to="/dashboard/recordings"
                          className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-0.5"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Placeholder when no mock interviews are found */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 gap-3">
                <Video className="w-10 h-10 opacity-30" />
                <div>
                  <p className="text-xs font-medium text-slate-400">No mock attempts found</p>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-[180px] mx-auto leading-normal">
                    When you record practicing a question in the Mock Interview section, it will show up here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
