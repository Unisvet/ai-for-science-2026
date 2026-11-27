import React, { useEffect } from 'react';
import { QrCode, X } from 'lucide-react';

export const QrCodeModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Presentation QR Code"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/50 p-6 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-700/70 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-mono mb-3">
          <QrCode className="w-3.5 h-3.5" />
          <span>Hybrid Presentation</span>
        </div>

        <h2 className="text-lg font-extrabold text-slate-100 tracking-tight">
          Scan to Open Slides &amp; Demos
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          APAC AI for Science DevFest 2026
        </p>

        <div className="p-4 rounded-2xl bg-white shadow-inner border border-slate-200">
          <img
            src="./media/slides/qrcode_apac_devfest_2026.png"
            alt="QR Code for APAC AI for Science DevFest 2026 presentation"
            className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
          />
        </div>

        <p className="text-[11px] font-mono text-slate-400 mt-4">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Q</kbd> or{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
};
