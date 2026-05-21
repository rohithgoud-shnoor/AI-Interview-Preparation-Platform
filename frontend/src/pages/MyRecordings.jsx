import React, { useEffect, useState } from 'react';
import { recordingsApi } from '../services/api';
import { Video, Calendar } from 'lucide-react';

const MyRecordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchRecordings();
  }, []);

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
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="font-semibold text-white line-clamp-2" title={rec.question}>
                  {rec.question}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto pt-2 border-t border-white/5">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(rec.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRecordings;
