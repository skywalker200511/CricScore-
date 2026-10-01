import { useState } from 'react';
import Modal from './Modal.jsx';

const DISMISSAL_TYPES = [
  { value: 'bowled', label: 'Bowled' },
  { value: 'caught', label: 'Caught' },
  { value: 'run_out', label: 'Run Out' },
  { value: 'stumped', label: 'Stumped' },
  { value: 'hit_wicket', label: 'Hit Wicket' },
  { value: 'retired', label: 'Retired' },
  { value: 'hit_out', label: 'Hit Out (Box Cricket)' },
];

export default function WicketModal({
  open,
  strikerId,
  nonStrikerId,
  battingPlayers,
  dismissedPlayerIds,
  onConfirm,
  onCancel,
  isLastWicket,
}) {
  const [step, setStep] = useState('wicket'); // 'wicket' | 'new_batsman'
  const [dismissedId, setDismissedId] = useState('');
  const [wicketType, setWicketType] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');

  const currentBatsmen = [
    battingPlayers.find(p => p.id === strikerId),
    battingPlayers.find(p => p.id === nonStrikerId),
  ].filter(Boolean);

  // Players available as new batsman (not dismissed, not currently batting)
  const availableNewBatsmen = battingPlayers.filter(
    p => !dismissedPlayerIds.includes(p.id) &&
         p.id !== strikerId &&
         p.id !== nonStrikerId
  );

  function handleConfirmWicket() {
    if (!dismissedId || !wicketType) return;
    if (isLastWicket) {
      // No new batsman needed - all out
      onConfirm({ dismissedId, wicketType, newBatsmanId: null });
      resetState();
    } else {
      setStep('new_batsman');
    }
  }

  function handleConfirmNewBatsman() {
    if (!newBatsmanId) return;
    onConfirm({ dismissedId, wicketType, newBatsmanId });
    resetState();
  }

  function resetState() {
    setStep('wicket');
    setDismissedId('');
    setWicketType('');
    setNewBatsmanId('');
  }

  function handleCancel() {
    resetState();
    onCancel();
  }

  if (step === 'new_batsman') {
    return (
      <Modal open={open} title="New Batsman">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Select New Batsman</label>
            <select
              value={newBatsmanId}
              onChange={e => setNewBatsmanId(e.target.value)}
              className="w-full p-3 bg-white border border-[#cbd5e1] rounded-lg text-sm font-semibold text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:border-[#0f172a]"
            >
              <option value="">Select Player</option>
              {availableNewBatsmen.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleConfirmNewBatsman}
            disabled={!newBatsmanId}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
              newBatsmanId
                ? 'bg-[#0f172a] text-white hover:bg-[#1e293b] active:scale-[0.99]'
                : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            CONFIRM
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title="Wicket">
      <div className="space-y-4">
        {/* Dismissed Player */}
        <div className="space-y-1">
          <label className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Dismissed Player</label>
          <select
            value={dismissedId}
            onChange={e => setDismissedId(e.target.value)}
            className="w-full p-3 bg-white border border-[#cbd5e1] rounded-lg text-sm font-semibold text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:border-[#0f172a]"
          >
            <option value="">Select Player</option>
            {currentBatsmen.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Dismissal Type */}
        <div className="space-y-1">
          <label className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Dismissal Type</label>
          <select
            value={wicketType}
            onChange={e => setWicketType(e.target.value)}
            className="w-full p-3 bg-white border border-[#cbd5e1] rounded-lg text-sm font-semibold text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:border-[#0f172a]"
          >
            <option value="">Select Type</option>
            {DISMISSAL_TYPES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8f9fa] transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirmWicket}
            disabled={!dismissedId || !wicketType}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              dismissedId && wicketType
                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c] active:scale-[0.99]'
                : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            CONFIRM WICKET
          </button>
        </div>
      </div>
    </Modal>
  );
}
