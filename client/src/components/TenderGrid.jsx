import React from 'react';
import { TenderCard } from './TenderCard';
import { FileQuestion, RotateCcw } from 'lucide-react';

export function TenderGrid({
  tenders,
  shortlistedIds,
  onToggleShortlist,
  onOpenQuickView,
  onOpenNote,
  notes,
  onResetFilters,
}) {
  if (tenders.length === 0) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center my-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Matching Tenders Found</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          No bids match your current query or filters. Try adjusting keywords, changing ministry selection, or enabling Reverse Auctions (RA).
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {tenders.map((tender) => (
        <TenderCard
          key={tender.id}
          tender={tender}
          isShortlisted={shortlistedIds.includes(tender.id)}
          onToggleShortlist={onToggleShortlist}
          onOpenQuickView={onOpenQuickView}
          onOpenNote={onOpenNote}
          tenderNote={notes[tender.id]}
        />
      ))}
    </div>
  );
}
