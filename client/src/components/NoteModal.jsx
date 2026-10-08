import React, { useState, useEffect } from 'react';
import { X, Edit3, Trash2 } from 'lucide-react';

export function NoteModal({
  tender,
  isOpen,
  onClose,
  initialNote,
  onSaveNote,
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (initialNote) {
      setText(initialNote.text || '');
    } else {
      setText('');
    }
  }, [initialNote, isOpen]);

  if (!isOpen || !tender) return null;

  const handleSave = () => {
    onSaveNote(tender.id, text);
    onClose();
  };

  const handleDelete = () => {
    onSaveNote(tender.id, '');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tender Quotation & Internal Note</h3>
              <p className="text-[11px] font-mono text-sky-400">{tender.bidNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Internal Strategy / Target Price / Compliance Notes
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="e.g. Quoted at ₹3.2L, technical compliance approved, bid bond DD submitted..."
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {initialNote ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Note</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
