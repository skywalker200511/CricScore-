import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTeams, createMatch } from '../lib/database.js';

export default function TeamSelectPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [battingFirstId, setBattingFirstId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await fetchTeams();
        setTeams(data);
      } catch (err) {
        setError(`Failed to load teams: ${err.message || err.toString()}`);
        console.error(err);
      }
    }
    loadTeams();
  }, []);

  const team1 = teams.find(t => t.id === team1Id);
  const team2 = teams.find(t => t.id === team2Id);
  const canContinue = team1Id && team2Id && team1Id !== team2Id && battingFirstId;

  async function handleContinue() {
    if (!canContinue || creating) return;
    setCreating(true);
    setError('');
    try {
      const { match } = await createMatch(team1Id, team2Id, battingFirstId);
      navigate(`/scorer/${match.id}`);
    } catch (err) {
      setError('Failed to create match. Please try again.');
      console.error(err);
      setCreating(false);
    }
  }

  // Available teams for team2 dropdown (exclude team1)
  const team2Options = teams.filter(t => t.id !== team1Id);

  return (
    <div 
      className="min-h-dvh flex flex-col bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{ backgroundImage: 'url(/team-select-bg.png)' }}
    >
      {/* Optional subtle overlay to ensure cards remain perfectly readable */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col flex-1">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-[#0f172a]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <h1 className="text-lg font-bold text-[#0f172a]">Match Setup</h1>
      </div>

      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full space-y-6">
        {/* Select Teams */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-wider text-[#64748b] uppercase">
            Select Teams
          </h2>

          {/* Team 1 */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-1">
            <label className="text-xs font-bold tracking-wider text-[#94a3b8] uppercase" htmlFor="team1">
              Team 1
            </label>
            <select
              id="team1"
              value={team1Id}
              onChange={e => {
                setTeam1Id(e.target.value);
                if (e.target.value === team2Id) setTeam2Id('');
                setBattingFirstId('');
              }}
              className="w-full bg-transparent text-[#0f172a] text-base font-semibold appearance-none py-1 focus:outline-none cursor-pointer"
            >
              <option value="">Select Team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Team 2 */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-1">
            <label className="text-xs font-bold tracking-wider text-[#94a3b8] uppercase" htmlFor="team2">
              Team 2
            </label>
            <select
              id="team2"
              value={team2Id}
              onChange={e => {
                setTeam2Id(e.target.value);
                setBattingFirstId('');
              }}
              className="w-full bg-transparent text-[#0f172a] text-base font-semibold appearance-none py-1 focus:outline-none cursor-pointer"
            >
              <option value="">Select Team</option>
              {team2Options.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Who Bats First */}
        {team1Id && team2Id && team1Id !== team2Id && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-wider text-[#64748b] uppercase">
              Who Bats First?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBattingFirstId(team1Id)}
                className={`p-4 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                  battingFirstId === team1Id
                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                    : 'bg-white text-[#0f172a] border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
              >
                {team1?.name || 'Team 1'}
              </button>
              <button
                onClick={() => setBattingFirstId(team2Id)}
                className={`p-4 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                  battingFirstId === team2Id
                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                    : 'bg-white text-[#0f172a] border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
              >
                {team2?.name || 'Team 2'}
              </button>
            </div>
          </section>
        )}

        {error && (
          <p className="text-sm text-[#dc2626] font-medium text-center">{error}</p>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!canContinue || creating}
          className={`w-full py-4 rounded-xl text-base font-bold tracking-wide flex items-center justify-center gap-2 transition-all ${
            canContinue && !creating
              ? 'bg-[#0f172a] text-white hover:bg-[#1e293b] active:scale-[0.99]'
              : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
          }`}
        >
          {creating ? 'Creating Match...' : 'CONTINUE TO SCORER'}
        </button>
      </div>
      </div>
    </div>
  );
}
