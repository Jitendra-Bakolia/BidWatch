import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Star,
  Edit3,
  Calendar,
  Box,
  Building,
  Shield,
  FileText,
  Clock,
  Gem,
} from 'lucide-react';

export function QuickViewModal({
  tender,
  isOpen,
  onClose,
  isShortlisted,
  onToggleShortlist,
  note,
  onSaveNote,
}) {
  if (!isOpen || !tender) return null;

  const [copied, setCopied] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(note?.text || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(tender.bidNumber || tender.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dStr) => {
    if (!dStr) return 'N/A';
    try {
      return new Date(dStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dStr;
    }
  };

  const handleSaveNote = () => {
    onSaveNote(tender.id, noteText);
    setEditingNote(false);
  };

  const isRa = tender.typeLabel === 'RA' || tender.bidType === 5 || tender.bidType === 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto terminal-scroll shadow-2xl shadow-black relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 sticky top-0 bg-[#111827] z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`tag-badge ${
                  isRa ? 'tag-ra' : 'tag-bid'
                }`}
              >
                {isRa ? '⚡ Reverse Auction (RA)' : '📄 Standard Bid'}
              </span>

              {tender.isWithin24Hours && (
                <span className="tag-badge tag-24h">Published Last 24h</span>
              )}

              {tender.isClosingIn24Hours && (
                <span className="tag-badge tag-closing">Closing in 24h</span>
              )}

              {tender.isHighValue && (
                <span className="tag-badge tag-high-value">💎 High Value</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-sky-400">
                {tender.bidNumber}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                title="Copy Bid Number"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-sm">
          {/* Title / Category */}
          <div>
            <h4 className="text-xs uppercase font-bold text-slate-400 mb-1">
              Category / Item Description
            </h4>
            <p className="text-base font-semibold text-white leading-relaxed">
              {tender.categoryName}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0f172a] p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-blue-400" />
                Total Quantity
              </span>
              <span className="text-base font-bold text-white font-mono">
                {Number(tender.quantity || 1).toLocaleString()} units
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Bid Start Date
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {formatDate(tender.startDate)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                Bid End Date
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {formatDate(tender.endDate)}
              </span>
            </div>
          </div>

          {/* Ministry & Department Breakdown */}
          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              Procuring Ministry & Department
            </h5>
            <div className="text-sm font-semibold text-white">
              {tender.ministry || 'Not Specified'}
            </div>
            {tender.department && (
              <div className="text-xs text-slate-300">
                Department: <span className="font-medium text-slate-200">{tender.department}</span>
              </div>
            )}
          </div>

          {/* Quotation / Internal Note Section */}
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                Internal Quotation & Strategy Notes
              </span>
              {!editingNote && (
                <button
                  type="button"
                  onClick={() => {
                    setNoteText(note?.text || '');
                    setEditingNote(true);
                  }}
                  className="text-xs text-amber-300 hover:underline font-semibold"
                >
                  {note ? 'Edit Note' : '+ Add Note'}
                </button>
              )}
            </div>

            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record target quoting price, margins, sub-vendors, or submission status..."
                  rows={3}
                  className="w-full bg-[#0b0f19] border border-amber-500/40 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNote(false)}
                    className="px-2.5 py-1 text-xs rounded text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="px-3 py-1 text-xs font-semibold bg-amber-500 text-black rounded hover:bg-amber-400"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 italic">
                {note?.text || 'No internal notes saved yet for this tender.'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleShortlist(tender.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              isShortlisted
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Star className={`w-4 h-4 ${isShortlisted ? 'fill-current' : ''}`} />
            <span>{isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={tender.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Download Official GeM Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
