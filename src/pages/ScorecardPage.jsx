import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMatch, fetchInnings, fetchDeliveries, fetchPlayersByTeam } from '../lib/database.js';
import { calculateInningsState, getMatchResult } from '../lib/scoringEngine.js';

export default function ScorecardPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [inningsData, setInningsData] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const m = await fetchMatch(matchId);
        setMatch(m);

        const allInnings = await fetchInnings(matchId);
        const inningsWithState = [];

        // Load all players for both teams
        const [playersA, playersB] = await Promise.all([
          fetchPlayersByTeam(m.team_a_id),
          fetchPlayersByTeam(m.team_b_id),
        ]);
        const playerMap = {};
        [...playersA, ...playersB].forEach(p => { playerMap[p.id] = p; });
        setPlayers(playerMap);

        for (const inn of allInnings) {
          const deliveries = await fetchDeliveries(inn.id);
          const state = calculateInningsState(deliveries);
          inningsWithState.push({ ...inn, state, deliveries });
        }
        setInningsData(inningsWithState);
      } catch (err) {
        console.error('Error loading scorecard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-[#64748b] font-medium">Loading scorecard...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-dvh bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-[#dc2626] font-medium">Match not found</p>
      </div>
    );
  }

  const innings1 = inningsData.find(i => i.innings_number === 1);
  const innings2 = inningsData.find(i => i.innings_number === 2);
  const result = innings1 && innings2
    ? getMatchResult(
        innings1.state,
        innings2.state,
        innings1.batting_team_id === match.team_a_id ? match.team_a.name : match.team_b.name,
        innings2.batting_team_id === match.team_a_id ? match.team_a.name : match.team_b.name,
      )
    : null;

  function getBattingTeamName(inn) {
    if (inn.batting_team_id === match.team_a_id) return match.team_a.name;
    return match.team_b.name;
  }

  function getBowlingTeamName(inn) {
    if (inn.bowling_team_id === match.team_a_id) return match.team_a.name;
    return match.team_b.name;
  }

  function renderInningsScorecard(innData) {
    if (!innData) return null;
    const { state } = innData;
    const battingTeamName = getBattingTeamName(innData);
    const bowlingTeamName = getBowlingTeamName(innData);

    // Get unique batters from deliveries
    const batterIds = [...new Set(innData.deliveries.map(d => d.striker_id))];
    // Get unique bowlers from deliveries
    const bowlerIds = [...new Set(innData.deliveries.map(d => d.bowler_id))];

    return (
      <div className="space-y-4">
        {/* Innings Header */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">{battingTeamName}</h3>
              <p className="text-xs text-[#64748b] font-medium">Innings {innData.innings_number}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#0f172a] tabular-nums">
                {state.totalRuns}/{state.totalWickets}
              </span>
              <p className="text-xs text-[#64748b] font-medium">{state.oversDisplay} overs</p>
            </div>
          </div>
        </div>

        {/* Batting */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#f8f9fa] border-b border-[#e2e8f0]">
            <h4 className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Batting</h4>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_40px_40px_40px_40px] px-4 py-2 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              <span>Batter</span>
              <span className="text-center">R</span>
              <span className="text-center">B</span>
              <span className="text-center">4s</span>
              <span className="text-center">6s</span>
            </div>
            {batterIds.map(id => {
              const player = players[id];
              const stats = state.batterStats[id] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
              return (
                <div key={id} className="grid grid-cols-[1fr_40px_40px_40px_40px] px-4 py-2.5 items-center">
                  <span className="text-sm font-semibold text-[#0f172a] truncate">{player?.name || 'Unknown'}</span>
                  <span className="text-sm font-bold text-[#0f172a] text-center tabular-nums">{stats.runs}</span>
                  <span className="text-sm text-[#64748b] text-center tabular-nums">{stats.balls}</span>
                  <span className="text-sm text-[#64748b] text-center tabular-nums">{stats.fours}</span>
                  <span className="text-sm text-[#64748b] text-center tabular-nums">{stats.sixes}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bowling */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#f8f9fa] border-b border-[#e2e8f0]">
            <h4 className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Bowling — {bowlingTeamName}</h4>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            <div className="grid grid-cols-[1fr_40px_40px_40px_50px] px-4 py-2 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              <span>Bowler</span>
              <span className="text-center">O</span>
              <span className="text-center">R</span>
              <span className="text-center">W</span>
              <span className="text-center">Econ</span>
            </div>
            {bowlerIds.map(id => {
              const player = players[id];
              const stats = state.bowlerStats[id] || { runs: 0, wickets: 0, legalBalls: 0 };
              const overs = `${Math.floor(stats.legalBalls / 6)}.${stats.legalBalls % 6}`;
              const economy = stats.legalBalls > 0 ? ((stats.runs / stats.legalBalls) * 6).toFixed(1) : '0.0';
              return (
                <div key={id} className="grid grid-cols-[1fr_40px_40px_40px_50px] px-4 py-2.5 items-center">
                  <span className="text-sm font-semibold text-[#0f172a] truncate">{player?.name || 'Unknown'}</span>
                  <span className="text-sm text-[#64748b] text-center tabular-nums">{overs}</span>
                  <span className="text-sm text-[#64748b] text-center tabular-nums">{stats.runs}</span>
                  <span className="text-sm font-bold text-[#0f172a] text-center tabular-nums">{stats.wickets}</span>
                  <span className="text-sm text-[#64748b] text-center tabular-nums">{economy}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f8f9fa]">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-[#0f172a]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <h1 className="text-lg font-bold text-[#0f172a]">Scorecard</h1>
      </div>

      <div className="px-4 pb-8 max-w-lg mx-auto w-full space-y-6">
        {/* Match Result */}
        {result && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 text-center space-y-2">
            <h2 className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Match Result</h2>
            <p className="text-base font-bold text-[#0f172a]">{result}</p>
          </div>
        )}

        {/* Innings 1 Scorecard */}
        {innings1 && renderInningsScorecard(innings1)}

        {/* Innings 2 Scorecard */}
        {innings2 && renderInningsScorecard(innings2)}

        {/* Back to Home */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 px-6 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] text-[#0f172a] rounded-xl text-sm font-semibold flex items-center justify-center transition-colors"
        >
          BACK TO HOME
        </button>
      </div>
    </div>
  );
}
