import React from 'react';
import {
  X,
  Star,
  Download,
  ExternalLink,
  Trash2,
  BookmarkCheck,
  Building,
  Box,
} from 'lucide-react';
import { downloadTendersCSV } from '../services/gemApi';

export function ShortlistDrawer({
  isOpen,
  onClose,
  shortlistedTenders,
  onToggleShortlist,
  onOpenQuickView,
  notes,
}) {
  if (!isOpen) return null;

  const handleExport = () => {
    downloadTendersCSV(shortlistedTenders, 'gem_shortlisted_tenders.csv');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-md bg-[#111827] border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Shortlisted Tenders ({shortlistedTenders.length})
                </h3>
                <p className="text-xs text-slate-400">Saved for review and bidding</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Strip */}
          {shortlistedTenders.length > 0 && (
            <div className="p-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {shortlistedTenders.length} items shortlisted
              </span>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-md border border-amber-500/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Shortlist CSV</span>
              </button>
            </div>
          )}

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 terminal-scroll">
            {shortlistedTenders.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                <Star className="w-10 h-10 mx-auto mb-3 text-slate-600 stroke-[1.5]" />
                <p className="font-semibold text-slate-400 mb-1">No tenders shortlisted yet</p>
                <p>Click the star icon on any bid to save it here for fast tracking.</p>
              </div>
            ) : (
              shortlistedTenders.map((tender) => {
                const tenderNote = notes[tender.id];
                return (
                  <div
                    key={tender.id}
                    className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition-all relative group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {tender.bidNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleShortlist(tender.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remove from shortlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4
                      onClick={() => onOpenQuickView(tender)}
                      className="text-xs font-semibold text-slate-100 line-clamp-2 hover:text-blue-400 cursor-pointer mb-2"
                    >
                      {tender.categoryName}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>Qty: {tender.quantity}</span>
                      <span className="truncate max-w-[180px]">{tender.ministry}</span>
                    </div>

                    {tenderNote && (
                      <div className="bg-amber-500/10 border-l-2 border-amber-500 p-2 rounded-r text-[11px] text-amber-300 mb-2 truncate">
                        📝 {tenderNote.text}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => onOpenQuickView(tender)}
                        className="text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        View Dossier
                      </button>
                      <a
                        href={tender.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                      >
                        <span>Official PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
