import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';

export default function MatchCompleteModal({
  open,
  team1Name, team1Runs, team1Wickets, team1Overs,
  team2Name, team2Runs, team2Wickets, team2Overs,
  result,
  matchId,
}) {
  const navigate = useNavigate();

  return (
    <Modal open={open} title="Match Complete">
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-bold text-[#0f172a]">{team1Name}</span>
            <span className="text-lg font-extrabold text-[#0f172a] tabular-nums">{team1Runs}/{team1Wickets}</span>
            <span className="text-xs text-[#64748b]">({team1Overs})</span>
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-bold text-[#0f172a]">{team2Name}</span>
            <span className="text-lg font-extrabold text-[#0f172a] tabular-nums">{team2Runs}/{team2Wickets}</span>
            <span className="text-xs text-[#64748b]">({team2Overs})</span>
          </div>
        </div>

        {result && (
          <p className="text-base font-bold text-[#16a34a] bg-[#f0fdf4] py-2 px-4 rounded-lg">{result}</p>
        )}

        <div className="space-y-2">
          <button
            onClick={() => navigate(`/scorecard/${matchId}`)}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#0f172a] text-white hover:bg-[#1e293b] active:scale-[0.99] transition-colors"
          >
            VIEW SCORECARD
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl text-sm font-bold bg-white border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8f9fa] transition-colors"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </Modal>
  );
}
