import Modal from './Modal.jsx';

export default function UndoConfirmModal({ open, onConfirm, onCancel }) {
  return (
    <Modal open={open} title="Undo Last Delivery">
      <div className="space-y-4 text-center">
        <p className="text-sm text-[#64748b]">Are you sure you want to undo the last delivery?</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8f9fa] transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#dc2626] text-white hover:bg-[#b91c1c] active:scale-[0.99] transition-colors"
          >
            UNDO
          </button>
        </div>
      </div>
    </Modal>
  );
}
