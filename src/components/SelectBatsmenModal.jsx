import { useState } from 'react';
import Modal from './Modal.jsx';

export default function SelectBatsmenModal({ open, players, onConfirm }) {
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');

  function handleConfirm() {
    if (strikerId && nonStrikerId && strikerId !== nonStrikerId) {
      onConfirm(strikerId, nonStrikerId);
      setStrikerId('');
      setNonStrikerId('');
    }
  }

  const availableForNonStriker = players.filter(p => p.id !== strikerId);
  const availableForStriker = players.filter(p => p.id !== nonStrikerId);

  return (
    <Modal open={open} title="Select Opening Batsmen">
      <div className="space-y-4">
        {/* Striker */}
        <div className="space-y-1">
          <label className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Striker</label>
          <select
            value={strikerId}
            onChange={e => setStrikerId(e.target.value)}
            className="w-full p-3 bg-white border border-[#cbd5e1] rounded-lg text-sm font-semibold text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:border-[#0f172a]"
          >
            <option value="">Select Player</option>
            {availableForStriker.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Non-Striker */}
        <div className="space-y-1">
          <label className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Non-Striker</label>
          <select
            value={nonStrikerId}
            onChange={e => setNonStrikerId(e.target.value)}
            className="w-full p-3 bg-white border border-[#cbd5e1] rounded-lg text-sm font-semibold text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:border-[#0f172a]"
          >
            <option value="">Select Player</option>
            {availableForNonStriker.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!strikerId || !nonStrikerId || strikerId === nonStrikerId}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
            strikerId && nonStrikerId && strikerId !== nonStrikerId
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
