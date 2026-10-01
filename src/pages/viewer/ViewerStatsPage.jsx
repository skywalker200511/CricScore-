import React, { useEffect, useState } from 'react';
import { fetchAllPlayers, fetchAllDeliveries } from '../../lib/database.js';

export default function ViewerStatsPage() {
  const [players, setPlayers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, d] = await Promise.all([fetchAllPlayers(), fetchAllDeliveries()]);
        setPlayers(p);
        setDeliveries(d);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading data...</div>;

  const stats = {};
  players.forEach(p => {
    stats[p.id] = {
      id: p.id, name: p.name, teamName: p.team?.name,
      runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
      wickets: 0, runsConceded: 0, ballsBowled: 0,
    };
  });

  deliveries.forEach(d => {
    if (d.striker_id && stats[d.striker_id]) {
      stats[d.striker_id].runs += (d.batter_runs || 0);
      if (d.batter_runs === 4) stats[d.striker_id].fours += 1;
      if (d.batter_runs === 6) stats[d.striker_id].sixes += 1;
      
      if (d.extra_type !== 'wide' && d.extra_type !== 'no_ball') {
        stats[d.striker_id].ballsFaced += 1;
      }
    }
    if (d.bowler_id && stats[d.bowler_id]) {
      stats[d.bowler_id].runsConceded += ((d.batter_runs || 0) + (d.extra_runs || 0));
      if (d.extra_type !== 'wide' && d.extra_type !== 'no_ball') {
        stats[d.bowler_id].ballsBowled += 1;
      }
      if (d.is_wicket && d.wicket_type !== 'run_out' && d.wicket_type !== 'retired') {
        stats[d.bowler_id].wickets += 1;
      }
    }
  });

  const playersList = Object.values(stats);
  playersList.forEach(p => {
    p.strikeRate = p.ballsFaced > 0 ? (p.runs / p.ballsFaced) * 100 : 0;
    p.economy = p.ballsBowled > 0 ? (p.runsConceded / p.ballsBowled) * 6 : 0;
  });

  const topScorers = [...playersList].sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate);
  
  // Sort by wickets first, then lowest economy, then highest balls bowled (to break ties fairly)
  const topWicketTakers = [...playersList]
    .filter(p => p.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy || b.ballsBowled - a.ballsBowled);
    
  const bestEconomy = [...playersList]
    .filter(p => p.ballsBowled >= 12)
    .sort((a, b) => a.economy - b.economy || b.wickets - a.wickets);
    
  const bestStrikeRate = [...playersList]
    .filter(p => p.runs >= 20)
    .sort((a, b) => b.strikeRate - a.strikeRate || b.runs - a.runs);

  const StatCard = ({ title, player, value, subtext }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col transition-all hover:shadow-md">
      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">{title}</h3>
      {player ? (
        <>
          <p className="font-black text-lg text-gray-900 leading-tight">{player.name}</p>
          <p className="text-xs text-gray-400 font-medium mb-3">{player.teamName}</p>
          <p className="text-3xl font-black text-indigo-600 mt-auto">{value}</p>
          {subtext && <p className="text-xs font-medium text-gray-500 mt-1">{subtext}</p>}
        </>
      ) : (
        <p className="text-gray-400 font-medium mt-auto text-sm">N/A</p>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-10 mb-12">
      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tournament Stats</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Top Scorer" 
          player={topScorers[0]?.runs > 0 ? topScorers[0] : null} 
          value={topScorers[0]?.runs} 
          subtext={`SR: ${topScorers[0]?.strikeRate.toFixed(1)}`} 
        />
        <StatCard 
          title="Top Wicket Taker" 
          player={topWicketTakers[0]?.wickets > 0 ? topWicketTakers[0] : null} 
          value={topWicketTakers[0]?.wickets} 
          subtext={`Econ: ${topWicketTakers[0]?.economy.toFixed(1)}`} 
        />
        <StatCard 
          title="Best Economy" 
          player={bestEconomy[0]} 
          value={bestEconomy[0]?.economy.toFixed(2)} 
          subtext="Min 2 overs" 
        />
        <StatCard 
          title="Best Strike Rate" 
          player={bestStrikeRate[0]} 
          value={bestStrikeRate[0]?.strikeRate.toFixed(1)} 
          subtext="Min 20 runs" 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <h3 className="font-bold text-gray-900 p-4 border-b border-gray-100 bg-gray-50/50">Batting Leaderboard</h3>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b border-gray-100">Player</th>
                <th className="p-4 border-b border-gray-100 text-right">Runs</th>
                <th className="p-4 border-b border-gray-100 text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              {topScorers.slice(0, 10).filter(p => p.runs > 0).map((p, i) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <span className="text-gray-400 font-bold text-xs w-4">{i + 1}</span>
                    <div>
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400 font-medium">{p.teamName}</div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-black text-gray-800">{p.runs}</td>
                  <td className="p-4 text-right font-medium text-gray-500">{p.strikeRate.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <h3 className="font-bold text-gray-900 p-4 border-b border-gray-100 bg-gray-50/50">Bowling Leaderboard</h3>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b border-gray-100">Player</th>
                <th className="p-4 border-b border-gray-100 text-right">W</th>
                <th className="p-4 border-b border-gray-100 text-right">Econ</th>
              </tr>
            </thead>
            <tbody>
              {topWicketTakers.slice(0, 10).filter(p => p.wickets > 0).map((p, i) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <span className="text-gray-400 font-bold text-xs w-4">{i + 1}</span>
                    <div>
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400 font-medium">{p.teamName}</div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-black text-gray-800">{p.wickets}</td>
                  <td className="p-4 text-right font-medium text-gray-500">{p.economy.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
