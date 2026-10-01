import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMatch, fetchInnings, fetchDeliveries, fetchPlayersByTeam } from '../../lib/database.js';
import { calculateInningsState, getMatchResult } from '../../lib/scoringEngine.js';

export default function ViewerScorecardPage() {
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

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading scorecard...</div>;
  if (!match) return <div className="p-8 text-center text-rose-500 font-medium">Match not found.</div>;

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

  function renderInningsScorecard(innData) {
    if (!innData) return null;
    const { state } = innData;
    const battingTeamName = getBattingTeamName(innData);

    const batterIds = [...new Set(innData.deliveries.map(d => d.striker_id))];
    const bowlerIds = [...new Set(innData.deliveries.map(d => d.bowler_id))];

    return (
      <div className="space-y-4 mt-6">
        {/* Innings Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{battingTeamName} Innings</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{state.oversDisplay} Overs</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-gray-900 tabular-nums leading-none">
                {state.totalRuns}/{state.totalWickets}
              </div>
            </div>
          </div>
        </div>

        {/* Batting Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-3 border-b border-gray-100 bg-gray-50">Batting</h4>
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-[1fr_40px_40px_40px_50px] px-4 py-2 bg-gray-50/50 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              <span>Batter</span>
              <span className="text-center">R</span>
              <span className="text-center">B</span>
              <span className="text-center">4s</span>
              <span className="text-center">6s</span>
            </div>
            {batterIds.map(id => {
              const player = players[id];
              const stats = state.batterStats[id] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
              
              const dismissalBall = innData.deliveries.find(d => d.is_wicket && d.dismissed_player_id === id);
              let statusText = 'not out';
              if (dismissalBall) {
                const bowlerName = players[dismissalBall.bowler_id]?.name || 'Unknown';
                let wicketTypeClean = dismissalBall.wicket_type ? dismissalBall.wicket_type.replace('_', ' ') : 'out';
                statusText = `${wicketTypeClean} b ${bowlerName}`;
              }

              return (
                <div key={id} className="grid grid-cols-[1fr_40px_40px_40px_50px] px-4 py-2.5 items-center hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{player?.name || 'Unknown'}</span>
                    <span className="text-[10px] text-gray-500 truncate capitalize">{statusText}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 text-center tabular-nums">{stats.runs}</span>
                  <span className="text-sm text-gray-500 text-center tabular-nums">{stats.balls}</span>
                  <span className="text-sm text-gray-500 text-center tabular-nums">{stats.fours}</span>
                  <span className="text-sm text-gray-500 text-center tabular-nums">{stats.sixes}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bowling Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-3 border-b border-gray-100 bg-gray-50">Bowling</h4>
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-[1fr_40px_40px_40px_50px] px-4 py-2 bg-gray-50/50 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
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
                <div key={id} className="grid grid-cols-[1fr_40px_40px_40px_50px] px-4 py-2.5 items-center hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-semibold text-gray-900 truncate">{player?.name || 'Unknown'}</span>
                  <span className="text-sm text-gray-500 text-center tabular-nums">{overs}</span>
                  <span className="text-sm text-gray-500 text-center tabular-nums">{stats.runs}</span>
                  <span className="text-sm font-black text-gray-900 text-center tabular-nums">{stats.wickets}</span>
                  <span className="text-sm text-gray-500 text-center tabular-nums">{economy}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/match/${matchId}`)}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-900 shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Full Scorecard</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">{match.team_a?.name} vs {match.team_b?.name}</p>
        </div>
      </div>

      <div className="space-y-6">
        {result && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center">
            <h2 className="text-[10px] font-black tracking-widest text-indigo-500 uppercase mb-1">Match Result</h2>
            <p className="text-lg font-black text-indigo-900">{result}</p>
          </div>
        )}

        {innings1 && renderInningsScorecard(innings1)}
        {innings2 && renderInningsScorecard(innings2)}
      </div>
    </div>
  );
}
