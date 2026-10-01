import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllMatches, fetchTeams } from '../../lib/database.js';

export default function ViewerHomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, t] = await Promise.all([fetchAllMatches(), fetchTeams()]);
        setMatches(m);
        setTeams(t);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading data...</div>;

  const points = {};
  teams.forEach(t => {
    points[t.id] = { name: t.name, played: 0, won: 0, lost: 0, pts: 0 };
  });

  matches.forEach(m => {
    if (m.status === 'completed' && m.winner_team_id) {
      if (points[m.team_a_id]) points[m.team_a_id].played++;
      if (points[m.team_b_id]) points[m.team_b_id].played++;
      
      const winnerId = m.winner_team_id;
      const loserId = m.team_a_id === winnerId ? m.team_b_id : m.team_a_id;
      
      if (points[winnerId]) {
        points[winnerId].won++;
        points[winnerId].pts += 2;
      }
      if (points[loserId]) {
        points[loserId].lost++;
      }
    }
  });

  const table = Object.values(points).sort((a, b) => b.pts - a.pts || b.won - a.won);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-12 mb-12">
      <section>
        <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Points Table</h2>
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4 border-b border-gray-200">Team</th>
                <th className="p-4 border-b border-gray-200 text-center">P</th>
                <th className="p-4 border-b border-gray-200 text-center">W</th>
                <th className="p-4 border-b border-gray-200 text-center">L</th>
                <th className="p-4 border-b border-gray-200 text-center">Pts</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {table.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-900 flex items-center gap-3">
                    <span className="text-gray-400 w-4 text-xs">{i + 1}</span>
                    {row.name}
                  </td>
                  <td className="p-4 text-center text-gray-600 font-medium">{row.played}</td>
                  <td className="p-4 text-center font-bold text-emerald-600">{row.won}</td>
                  <td className="p-4 text-center font-bold text-rose-600">{row.lost}</td>
                  <td className="p-4 text-center font-black text-indigo-600 text-base">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Matches</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map(m => (
            <Link key={m.id} to={`/match/${m.id}`} className="block bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-wider ${m.status === 'live' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                  {m.status}
                </span>
                <span className="text-gray-400 text-xs font-medium">{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center font-black text-lg text-gray-900">
                <span className="truncate max-w-[42%]">{m.team_a?.name}</span>
                <span className="text-gray-300 text-xs font-bold px-2">VS</span>
                <span className="truncate max-w-[42%] text-right">{m.team_b?.name}</span>
              </div>
              {m.winner_team_id && m.status === 'completed' && (
                <div className="mt-4 pt-3 border-t border-gray-100 text-sm font-semibold text-indigo-600">
                  {m.winner_team_id === m.team_a_id ? m.team_a?.name : m.team_b?.name} won
                </div>
              )}
            </Link>
          ))}
          {matches.length === 0 && <div className="text-gray-400 font-medium col-span-2 text-center py-8">No matches found.</div>}
        </div>
      </section>
    </div>
  );
}
