import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchActiveMatch } from '../lib/database.js';

import StickmanCricket from '../components/StickmanCricket.jsx';

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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#0f172a]">
      {/* Stickman Background */}
      <StickmanCricket />
      
      {/* Subtle overlay to help text pop over the stickman */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-[#0f172a]/20"></div>

      <div className="w-full max-w-md flex flex-col items-center space-y-10 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-xl">
            CricScore+
          </h1>
          <p className="text-lg text-gray-200 font-semibold drop-shadow-md">
            Live Box Cricket Scoring
          </p>
        </div>

        {/* Actions */}
        <div className="w-full space-y-4">
          <button
            onClick={() => navigate('/team-select')}
            className="w-full py-4 px-6 bg-white hover:bg-gray-100 text-[#0f172a] rounded-xl text-lg font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-2xl active:scale-[0.98]"
          >
            START MATCH
          </button>

          {activeMatch && (
            <button
              onClick={() => navigate(`/scorer/${activeMatch.id}`)}
              className="w-full py-3.5 px-6 bg-black/40 hover:bg-black/60 border border-white/20 text-white rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1.5 transition-all backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                RESUME LIVE MATCH
              </div>
              <span className="text-gray-300 font-normal text-xs">
                {activeMatch.team_a?.name} vs {activeMatch.team_b?.name}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
