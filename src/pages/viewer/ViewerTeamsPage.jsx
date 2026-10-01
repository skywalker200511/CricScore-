import React, { useEffect, useState } from 'react';
import { fetchTeams, fetchAllPlayers, fetchAllDeliveries } from '../../lib/database.js';

export default function ViewerTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, p, d] = await Promise.all([fetchTeams(), fetchAllPlayers(), fetchAllDeliveries()]);
        setTeams(t);
        setPlayers(p);
        setDeliveries(d);
        if (t.length > 0) setSelectedTeam(t[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading data...</div>;

  const playerStats = {};
  players.forEach(p => {
    playerStats[p.id] = { id: p.id, name: p.name, team_id: p.team_id, runs: 0, wickets: 0 };
  });

  deliveries.forEach(d => {
    if (d.striker_id && playerStats[d.striker_id]) {
      playerStats[d.striker_id].runs += d.batter_runs;
    }
    if (d.is_wicket && d.bowler_id && playerStats[d.bowler_id]) {
      if (d.wicket_type !== 'run_out' && d.wicket_type !== 'retired') {
        playerStats[d.bowler_id].wickets += 1;
      }
    }
  });

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 mb-12">
      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Teams</h2>
      
      <div className="flex flex-wrap gap-2 pb-4">
        {teams.map(t => (
          <button 
            key={t.id}
            onClick={() => setSelectedTeam(t.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 min-w-[120px] text-center ${
              selectedTeam === t.id 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      
      {selectedTeam && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block"></span>
            {teams.find(t => t.id === selectedTeam)?.name} Squad
          </h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Object.values(playerStats)
              .filter(p => p.team_id === selectedTeam)
              .map(p => (
              <div key={p.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all flex flex-col">
                <p className="font-black text-gray-900 text-lg mb-4 leading-tight break-words">{p.name}</p>
                <div className="mt-auto flex gap-6 items-center text-xs font-bold uppercase tracking-wider text-gray-500 border-t border-gray-200/60 pt-3">
                  <div className="flex gap-2 items-center">
                    <span>Runs:</span>
                    <span className="text-sm text-gray-900">{p.runs}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>Wickets:</span>
                    <span className="text-sm text-gray-900">{p.wickets}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
