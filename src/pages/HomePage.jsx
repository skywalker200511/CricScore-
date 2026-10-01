import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchActiveMatch } from '../lib/database.js';

export default function HomePage() {
  const navigate = useNavigate();
  const [activeMatch, setActiveMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkActiveMatch() {
      try {
        const match = await fetchActiveMatch();
        setActiveMatch(match);
      } catch (err) {
        console.error('Error checking active match:', err);
      } finally {
        setLoading(false);
      }
    }
    checkActiveMatch();
  }, []);

  return (
    <div 
      className="min-h-dvh flex flex-col items-center justify-center px-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(/home-bg.png)' }}
    >
      {/* Subtle light overlay to ensure text is perfectly readable over the sketch */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]"></div>

      <div className="w-full max-w-md flex flex-col items-center space-y-8 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-2 bg-white/70 p-6 rounded-3xl shadow-sm backdrop-blur-md border border-white/50 w-full">
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">
            CricScore+
          </h1>
          <p className="text-base text-[#475569] font-bold">
            Live Box Cricket Scoring
          </p>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 pt-4">
          <button
            onClick={() => navigate('/team-select')}
            className="w-full py-4 px-6 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-2xl text-lg font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98]"
          >
            START MATCH
          </button>

          {activeMatch && (
            <button
              onClick={() => navigate(`/scorer/${activeMatch.id}`)}
              className="w-full py-3.5 px-6 bg-white/90 border-2 border-white hover:border-[#e2e8f0] text-[#0f172a] rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md backdrop-blur-sm"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_8px_#ef4444]"></span>
              RESUME LIVE MATCH
              <span className="text-[#64748b] font-semibold ml-1">
                {activeMatch.team_a?.name} vs {activeMatch.team_b?.name}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
