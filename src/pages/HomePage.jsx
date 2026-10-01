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
    <div className="min-h-dvh bg-[#f8f9fa] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
            CricScore+
          </h1>
          <p className="text-base text-[#64748b] font-medium">
            Live Box Cricket Scoring
          </p>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3">
          <button
            onClick={() => navigate('/team-select')}
            className="w-full py-4 px-6 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl text-lg font-bold tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            START MATCH
          </button>

          {activeMatch && (
            <button
              onClick={() => navigate(`/scorer/${activeMatch.id}`)}
              className="w-full py-3 px-6 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] text-[#0f172a] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse"></span>
              RESUME LIVE MATCH
              <span className="text-[#64748b] font-normal ml-2">
                {activeMatch.team_a?.name} vs {activeMatch.team_b?.name}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
