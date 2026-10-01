import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMatch, fetchInnings, fetchDeliveries, fetchPlayersByTeam, subscribeToDeliveries } from '../../lib/database.js';
import { calculateInningsState, getMatchResult } from '../../lib/scoringEngine.js';

export default function ViewerMatchPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub = null;
    async function load() {
      try {
        const m = await fetchMatch(matchId);
        setMatch(m);
        const inv = await fetchInnings(matchId);
        setInnings(inv);
        
        const [pa, pb] = await Promise.all([
          fetchPlayersByTeam(m.team_a_id),
          fetchPlayersByTeam(m.team_b_id)
        ]);
        
        const pMap = {};
        [...pa, ...pb].forEach(p => pMap[p.id] = p.name);
        setPlayers(pMap);

        const currentInn = inv.find(i => i.status === 'in_progress' || i.status === 'live') || inv[inv.length - 1];
        
        // Fetch deliveries for ALL innings so completed view has both scores
        const deliveryPromises = inv.map(i => fetchDeliveries(i.id));
        const allDeliveriesArrays = await Promise.all(deliveryPromises);
        const allDeliveries = allDeliveriesArrays.flat();
        setDeliveries(allDeliveries);

        if (currentInn && m.status === 'live') {
          sub = subscribeToDeliveries(currentInn.id, (payload) => {
            if (payload.eventType === 'INSERT') {
              setDeliveries(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'DELETE') {
              setDeliveries(prev => prev.filter(del => del.id !== payload.old.id));
            }
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    
    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [matchId]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading match data...</div>;
  if (!match) return <div className="p-8 text-center text-rose-500 font-medium">Match not found.</div>;

  const currentInn = innings.find(i => i.status === 'in_progress' || i.status === 'live') || innings[innings.length - 1];
  
  // Calculate states
  const innings1 = innings.find(i => i.innings_number === 1);
  const innings2 = innings.find(i => i.innings_number === 2);
  
  const inn1Deliveries = deliveries.filter(d => d.innings_id === innings1?.id);
  const inn2Deliveries = deliveries.filter(d => d.innings_id === innings2?.id);
  
  const state1 = innings1 ? calculateInningsState(inn1Deliveries) : null;
  const state2 = innings2 ? calculateInningsState(inn2Deliveries) : null;
  
  const currentState = currentInn?.innings_number === 2 ? state2 : state1;
  const currentDeliveries = currentInn?.innings_number === 2 ? inn2Deliveries : inn1Deliveries;
  
  let result = null;
  let inn1Winner = false;
  let inn2Winner = false;
  let inn1Color = "text-gray-900";
  let inn2Color = "text-gray-900";

  if (match.status === 'completed' && state1 && state2) {
    const team1Name = innings1.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name;
    const team2Name = innings2.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name;
    result = getMatchResult(state1, state2, team1Name, team2Name);
    
    if (state1.totalRuns > state2.totalRuns) {
      inn1Winner = true;
      inn1Color = "text-emerald-600";
      inn2Color = "text-rose-600";
    } else if (state2.totalRuns > state1.totalRuns) {
      inn2Winner = true;
      inn1Color = "text-rose-600";
      inn2Color = "text-emerald-600";
    }
  }

  // Current over deliveries format for display
  const currentOverDeliveries = [];
  if (currentState) {
    currentState.currentOverDeliveries.forEach(d => {
      let str = d.total_runs.toString();
      if (d.is_wicket) str = 'W';
      else if (d.extra_type === 'wide') str = d.extra_runs + 'wd';
      else if (d.extra_type === 'no_ball') str = d.extra_runs + 'nb';
      currentOverDeliveries.push(str);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-4 mb-12 space-y-6">
      
      {/* MATCH HEADER & RESULT (For completed matches) */}
      {match.status === 'completed' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-sm">
          <span className="px-3 py-1 text-[10px] rounded-md font-black uppercase tracking-widest bg-gray-900 text-white mb-4 inline-block">
            COMPLETED
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-indigo-600 tracking-tight leading-tight mb-2">
            {inn1Winner || inn2Winner ? `${inn1Winner ? (innings1?.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name) : (innings2?.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name)} Won` : 'Match Tied'}
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-16">
            <div className="text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {innings1?.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name}
              </p>
              <p className={`text-4xl font-black tabular-nums ${inn1Color}`}>
                {state1?.totalRuns}/{state1?.totalWickets} <span className="text-lg text-gray-400">({state1?.oversDisplay})</span>
              </p>
            </div>
            <div className="hidden sm:block w-px h-16 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {innings2?.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name}
              </p>
              <p className={`text-4xl font-black tabular-nums ${inn2Color}`}>
                {state2 ? `${state2.totalRuns}/${state2.totalWickets}` : 'DNB'} {state2 && <span className="text-lg text-gray-400">({state2.oversDisplay})</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LIVE VIEW (For live matches) */}
      {match.status === 'live' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white p-6 text-center">
            <div className="flex justify-between items-center mb-4">
              <span className="px-3 py-1 text-[10px] rounded-md font-black uppercase tracking-widest bg-rose-500 text-white animate-pulse">
                LIVE
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Innings {currentInn?.innings_number || 1}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              {match.team_a?.name} <span className="text-gray-500 text-lg mx-2">vs</span> {match.team_b?.name}
            </h1>
            {currentInn?.target && (
              <div className="inline-block bg-gray-800 rounded-full px-4 py-1.5 text-sm font-bold text-gray-300 mt-2">
                Target: <span className="text-white">{currentInn.target}</span>
              </div>
            )}
          </div>
          
          <div className="p-8 text-center border-b border-gray-100 bg-gray-50/30">
            <div className="text-6xl font-black text-gray-900 mb-3 tracking-tighter">
              {currentState?.totalRuns || 0}<span className="text-4xl text-gray-400 mx-2">/</span>{currentState?.totalWickets || 0}
            </div>
            <div className="text-xl text-gray-500 font-bold tracking-tight">
              Over <span className="text-gray-900">{currentState?.oversDisplay || '0.0'}</span>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {currentOverDeliveries.length > 0 ? currentOverDeliveries.map((b, i) => (
                <span key={i} className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-black shadow-sm ${
                  b === 'W' ? 'bg-rose-500 text-white' : 
                  b.includes('wd') || b.includes('nb') ? 'bg-amber-100 text-amber-800' : 
                  'bg-white border border-gray-200 text-gray-800'
                }`}>
                  {b}
                </span>
              )) : <span className="text-sm text-gray-400 font-medium">New Over</span>}
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b border-gray-100">
            <div className="p-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Batters</h3>
              <div className="space-y-4">
                {[currentState?.currentStrikerId, currentState?.currentNonStrikerId].filter(Boolean).length > 0 ? 
                  [currentState?.currentStrikerId, currentState?.currentNonStrikerId].filter(Boolean).map(id => {
                  const stats = currentState.batterStats[id] || { runs: 0, balls: 0 };
                  const isStriker = id === currentState.currentStrikerId;
                  return (
                    <div key={id} className="flex justify-between items-center">
                      <span className="font-bold text-gray-900 flex items-center text-sm">
                        {players[id]} {isStriker && <span className="text-rose-500 ml-1.5 text-lg leading-none">*</span>}
                      </span>
                      <span className="font-black text-gray-900">
                        {stats.runs} <span className="text-gray-400 font-medium text-xs ml-1">({stats.balls})</span>
                      </span>
                    </div>
                  );
                }) : <div className="text-gray-400 text-sm font-medium">No batters at the crease</div>}
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Bowler</h3>
              {currentState?.currentBowlerId ? (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-sm">{players[currentState.currentBowlerId]}</span>
                  <span className="font-black text-gray-900">
                    {currentState.bowlerStats[currentState.currentBowlerId]?.wickets || 0}<span className="text-gray-400 mx-1">-</span>{currentState.bowlerStats[currentState.currentBowlerId]?.runs || 0}
                    <span className="text-gray-400 font-medium text-xs ml-1.5">
                      ({Math.floor((currentState.bowlerStats[currentState.currentBowlerId]?.legalBalls || 0) / 6)}.{((currentState.bowlerStats[currentState.currentBowlerId]?.legalBalls || 0) % 6)})
                    </span>
                  </span>
                </div>
              ) : <div className="text-gray-400 text-sm font-medium">No current bowler</div>}
            </div>
          </div>
        </div>
      )}
      
      {/* Full Scorecard Link */}
      <div>
        <Link 
          to={`/match/${matchId}/scorecard`}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black tracking-wide text-center flex items-center justify-center hover:bg-gray-800 transition-colors shadow-xl active:scale-[0.98]"
        >
          VIEW FULL SCORECARD
        </Link>
      </div>
    </div>
  );
}
