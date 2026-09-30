import Modal from './Modal.jsx';

export default function InningsCompleteModal({ open, teamName, runs, wickets, overs, onStartSecondInnings }) {
  return (
    <Modal open={open} title="Innings Complete">
      <div className="space-y-4 text-center">
        <div>
          <h3 className="text-lg font-bold text-[#0f172a]">{teamName}</h3>
          <p className="text-3xl font-extrabold text-[#0f172a] tabular-nums mt-1">
            {runs} / {wickets}
          </p>
          <p className="text-sm text-[#64748b] font-medium mt-1">{overs} overs</p>
        </div>
        <button
          onClick={onStartSecondInnings}
          className="w-full py-3 rounded-xl text-sm font-bold bg-[#0f172a] text-white hover:bg-[#1e293b] active:scale-[0.99] transition-colors"
        >
          START SECOND INNINGS
        </button>
      </div>
    </Modal>
  );
}
