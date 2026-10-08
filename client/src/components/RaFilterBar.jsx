import React from 'react';
import { Flame, Check, HelpCircle } from 'lucide-react';

export function RaFilterBar({
  showRa,
  onToggleShowRa,
  raMode,
  onChangeRaMode,
  raCount,
}) {
  return (
    <div className="bg-[#111827] border border-purple-500/30 rounded-xl p-3.5 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-purple-950/20">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showRa}
            onChange={(e) => onToggleShowRa(e.target.checked)}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer accent-purple-600"
          />
          <span className="text-sm font-bold text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-purple-400" />
            Show RA (Reverse Auction) Tenders
          </span>
        </label>

        <span className="tag-badge tag-ra text-xs">
          {raCount.toLocaleString()} RA Available
        </span>

        <span className="text-xs text-slate-400 hidden sm:inline">
          {showRa
            ? raMode === 'only'
              ? '⚡ Viewing exclusively Reverse Auctions'
              : '⚡ Reverse Auctions included alongside standard BIDs'
            : '(Unchecked by default: RA tenders are filtered out)'}
        </span>
      </div>

      {showRa && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-purple-300 font-medium">RA View:</span>
          <button
            type="button"
            onClick={() => onChangeRaMode('include')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              raMode === 'include'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            All (Bids + RA)
          </button>
          <button
            type="button"
            onClick={() => onChangeRaMode('only')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              raMode === 'only'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            Only RA
          </button>
        </div>
      )}
    </div>
  );
}
