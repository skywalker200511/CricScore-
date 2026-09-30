export default function Modal({ open, children, title }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.4)]" />
      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-white border border-[#cbd5e1] rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85dvh] overflow-y-auto">
        {title && (
          <h2 className="text-base font-bold text-[#0f172a] text-center">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
