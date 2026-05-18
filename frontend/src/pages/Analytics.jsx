import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AlertTriangle, TrendingUp, BookOpen } from 'lucide-react';

const radarData = [
  { subject: 'React', A: 90, fullMark: 100 },
  { subject: 'System Design', A: 65, fullMark: 100 },
  { subject: 'Algorithms', A: 80, fullMark: 100 },
  { subject: 'Communication', A: 85, fullMark: 100 },
  { subject: 'Problem Solving', A: 75, fullMark: 100 },
  { subject: 'Behavioral', A: 88, fullMark: 100 },
];

const barData = [
  { name: 'Week 1', score: 60 },
  { name: 'Week 2', score: 68 },
  { name: 'Week 3', score: 75 },
  { name: 'Week 4', score: 85 },
];

const Analytics = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics & Performance</h1>
        <p className="text-slate-400 mt-2">Detailed breakdown of your interview skills and areas for improvement.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-white mb-6">Skills Radar</h3>
          <div className="h-[350px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                <Radar name="You" dataKey="A" stroke="#9333ea" strokeWidth={2} fill="#9333ea" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weak Topics */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-semibold text-white">Areas to Improve</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            {[
              { topic: 'System Design (Microservices)', score: 65, tip: 'Review API gateway patterns and data consistency models.' },
              { topic: 'Dynamic Programming', score: 70, tip: 'Practice top-down memoization problems on LeetCode.' },
              { topic: 'Database Indexing', score: 75, tip: 'Understand B-trees and when to use composite indexes.' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-white">{item.topic}</h4>
                  <span className="text-sm font-bold text-red-400">{item.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${item.score}%` }}></div>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg">
                  <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p>{item.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Monthly Progress</h3>
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
              <TrendingUp className="w-4 h-4" />
              <span>+25% overall improvement</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {
                    barData.map((entry, index) => (
                      <cell key={`cell-${index}`} fill={index === barData.length - 1 ? '#9333ea' : '#3b82f6'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
