import { useState } from 'react';
import Modal from './Modal.jsx';

export default function SelectBowlerModal({ open, players, completedBowlerIds = [], overNumber, onConfirm }) {
  const [bowlerId, setBowlerId] = useState('');

  const availableBowlers = players.filter(p => !completedBowlerIds.includes(p.id));

  function handleConfirm() {
    if (bowlerId) {
      onConfirm(bowlerId);
      setBowlerId('');
    }
  }

  return (
    <Modal open={open} title={overNumber ? `Over Complete — Select Next Bowler` : 'Select Opening Bowler'}>
      <div className="space-y-4">
        {overNumber && (
          <p className="text-sm text-[#64748b] text-center font-medium">Over {overNumber} completed</p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold tracking-wider text-[#64748b] uppercase">Bowler</label>
          <select
            value={bowlerId}
            onChange={e => setBowlerId(e.target.value)}
            className="w-full p-3 bg-white border border-[#cbd5e1] rounded-lg text-sm font-semibold text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:border-[#0f172a]"
          >
            <option value="">Select Bowler</option>
            {availableBowlers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {completedBowlerIds.length > 0 && (
            <p className="text-xs text-[#94a3b8] mt-1">
              {completedBowlerIds.length} bowler{completedBowlerIds.length > 1 ? 's' : ''} already bowled
            </p>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!bowlerId}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
            bowlerId
              ? 'bg-[#0f172a] text-white hover:bg-[#1e293b] active:scale-[0.99]'
              : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
          }`}
        >
          CONTINUE
        </button>
      </div>
    </Modal>
  );
}
