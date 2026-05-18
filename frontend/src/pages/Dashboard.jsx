import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'May 12', score: 25 },
  { name: 'May 13', score: 45 },
  { name: 'May 14', score: 65 },
  { name: 'May 15', score: 50 },
  { name: 'May 16', score: 70 },
  { name: 'May 17', score: 85 },
  { name: 'May 18', score: 72 },
  { name: 'May 19', score: 90 },
];

const StatCard = ({ title, value, subtitle, subtitleColor }) => (
  <div className="glass-card p-6 flex flex-col justify-center">
    <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
    <h3 className="text-3xl font-bold text-white">{value}</h3>
    {subtitle && (
      <p className={`text-sm mt-2 font-medium ${subtitleColor}`}>{subtitle}</p>
    )}
  </div>
);

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-slate-400 font-medium">Keep practicing and improve your skills!</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Interviews Taken" value="12" />
        <StatCard title="Average Score" value="78%" />
        <StatCard title="Questions Attempted" value="156" />
        <StatCard 
          title="Improvement" 
          value="+23%" 
          subtitle="vs last week" 
          subtitleColor="text-emerald-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Overview Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Performance Overview</h3>
          <div className="h-[300px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                  tick={{fill: '#64748b', fontSize: 12}} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
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
          </div>
        </div>

        {/* Weak Topics */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-white">Weak Topics</h3>
            <button className="text-sm font-medium text-primary hover:text-secondary transition-colors">View All</button>
          </div>
          
          <div className="space-y-6 flex-1">
            {[
              { topic: 'Operating Systems', score: 40, color: 'bg-red-500' },
              { topic: 'DBMS', score: 45, color: 'bg-amber-500' },
              { topic: 'System Design', score: 50, color: 'bg-purple-500' },
              { topic: 'OOPs Concepts', score: 60, color: 'bg-emerald-500' },
              { topic: 'Networking', score: 70, color: 'bg-blue-500' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-300">{item.topic}</span>
                  <span className="text-white">{item.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
