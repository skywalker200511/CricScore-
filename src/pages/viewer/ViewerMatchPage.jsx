import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchMatch, fetchInnings, fetchDeliveries, fetchPlayersByTeam, subscribeToDeliveries } from '../../lib/database.js';

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
        if (currentInn) {
          const d = await fetchDeliveries(currentInn.id);
          setDeliveries(d);

          if (m.status === 'live') {
            sub = subscribeToDeliveries(currentInn.id, (payload) => {
              if (payload.eventType === 'INSERT') {
                setDeliveries(prev => [...prev, payload.new]);
              } else if (payload.eventType === 'DELETE') {
                setDeliveries(prev => prev.filter(del => del.id !== payload.old.id));
              }
            });
          }
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
  
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  const batterStats = {};
  const bowlerStats = {};
  
  deliveries.forEach(d => {
    runs += d.total_runs;
    if (d.is_wicket) wickets++;
    if (d.extra_type !== 'wide' && d.extra_type !== 'no_ball') legalBalls++;
    
    if (d.striker_id) {
      if (!batterStats[d.striker_id]) batterStats[d.striker_id] = { runs: 0, balls: 0 };
      batterStats[d.striker_id].runs += d.batter_runs;
      if (d.extra_type !== 'wide' && d.extra_type !== 'no_ball') {
        batterStats[d.striker_id].balls++;
      }
    }
    
    if (d.bowler_id) {
      if (!bowlerStats[d.bowler_id]) bowlerStats[d.bowler_id] = { runs: 0, balls: 0, wickets: 0 };
      bowlerStats[d.bowler_id].runs += d.total_runs;
      if (d.extra_type !== 'wide' && d.extra_type !== 'no_ball') {
        bowlerStats[d.bowler_id].balls++;
      }
      if (d.is_wicket && d.wicket_type !== 'run_out' && d.wicket_type !== 'retired') {
        bowlerStats[d.bowler_id].wickets++;
      }
    }
  });
  
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  
  let currentBatsmen = [];
  let currentBowler = null;
  if (deliveries.length > 0) {
    const lastD = deliveries[deliveries.length - 1];
    
    if (!lastD.is_wicket || lastD.dismissed_player_id !== lastD.striker_id) currentBatsmen.push(lastD.striker_id);
    if (!lastD.is_wicket || lastD.dismissed_player_id !== lastD.non_striker_id) currentBatsmen.push(lastD.non_striker_id);
    
    currentBowler = lastD.bowler_id;
  }
  
  const currentOverDeliveries = [];
  let currOverNum = deliveries.length > 0 ? deliveries[deliveries.length - 1].over_number : 0;
  deliveries.filter(d => d.over_number === currOverNum).forEach(d => {
    let str = d.total_runs.toString();
    if (d.is_wicket) str = 'W';
    else if (d.extra_type === 'wide') str = d.extra_runs + 'wd';
    else if (d.extra_type === 'no_ball') str = d.extra_runs + 'nb';
    currentOverDeliveries.push(str);
  });

  return (
    <div className="max-w-2xl mx-auto p-4 mb-12">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Match Header */}
        <div className="bg-gray-900 text-white p-6 text-center">
          <div className="flex justify-between items-center mb-4">
            <span className={`px-3 py-1 text-[10px] rounded-md font-black uppercase tracking-widest ${match.status === 'live' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'}`}>
              {match.status}
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
        
        {/* Score Display */}
        <div className="p-8 text-center border-b border-gray-100 bg-gray-50/30">
          <div className="text-6xl font-black text-gray-900 mb-3 tracking-tighter">
            {runs}<span className="text-4xl text-gray-400 mx-2">/</span>{wickets}
          </div>
          <div className="text-xl text-gray-500 font-bold tracking-tight">
            Over <span className="text-gray-900">{overs}.{balls}</span>
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
          {/* Batters */}
          <div className="p-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Batters</h3>
            <div className="space-y-4">
              {currentBatsmen.length > 0 ? currentBatsmen.map(id => {
                const stats = batterStats[id] || { runs: 0, balls: 0 };
                const isStriker = deliveries.length > 0 && deliveries[deliveries.length - 1].striker_id === id;
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
          
          {/* Bowler */}
          <div className="p-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Bowler</h3>
            {currentBowler ? (
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-sm">{players[currentBowler]}</span>
                <span className="font-black text-gray-900">
                  {bowlerStats[currentBowler]?.wickets || 0}<span className="text-gray-400 mx-1">-</span>{bowlerStats[currentBowler]?.runs || 0}
                  <span className="text-gray-400 font-medium text-xs ml-1.5">
                    ({Math.floor((bowlerStats[currentBowler]?.balls || 0) / 6)}.{((bowlerStats[currentBowler]?.balls || 0) % 6)})
                  </span>
                </span>
              </div>
            ) : <div className="text-gray-400 text-sm font-medium">No current bowler</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
