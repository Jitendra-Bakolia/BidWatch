import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, ArrowRight, Building, Box } from 'lucide-react';

export function SearchModal({
  isOpen,
  onClose,
  tenders,
  onSelectTender,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = query.trim()
    ? tenders.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.bidNumber?.toLowerCase().includes(q) ||
          t.categoryName?.toLowerCase().includes(q) ||
          t.ministry?.toLowerCase().includes(q) ||
          t.department?.toLowerCase().includes(q)
        );
      }).slice(0, 10)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenders by keyword, bid ID, ministry, item specs..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline px-2 py-0.5 text-[10px] font-mono bg-slate-900 border border-slate-800 rounded text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto terminal-scroll p-2">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Type to search across all loaded government tenders and ministries.
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching tenders found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((tender) => (
                <div
                  key={tender.id}
                  onClick={() => {
                    onSelectTender(tender);
                    onClose();
                  }}
                  className="p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors border border-transparent hover:border-slate-700/60 flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {tender.bidNumber}
                      </span>
                      <span className={`tag-badge text-[10px] ${tender.typeLabel === 'RA' ? 'tag-ra' : 'tag-bid'}`}>
                        {tender.typeLabel || 'BID'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Qty: {tender.quantity}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-1">
                      {tender.categoryName}
                    </h4>

                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {tender.ministry}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
