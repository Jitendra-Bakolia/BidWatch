import React from 'react';
import { Clock, Star, Search, Flame, FileText } from 'lucide-react';

export function MobileBottomBar({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onOpenShortlist,
  shortlistCount,
  showRa,
  onToggleShowRa,
  onOpenLogs,
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2 flex items-center justify-around">
      <button
        type="button"
        onClick={() => onSelectTab('last24h')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
          activeTab === 'last24h' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>24h Bids</span>
      </button>

      <button
        type="button"
        onClick={onOpenShortlist}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors relative ${
          activeTab === 'shortlisted' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <Star className="w-4 h-4" />
          {shortlistCount > 0 && (
            <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-black rounded-full text-[9px] flex items-center justify-center font-bold">
              {shortlistCount}
            </span>
          )}
        </div>
        <span>Starred</span>
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200"
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
      </button>

      <button
        type="button"
        onClick={() => onToggleShowRa(!showRa)}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
          showRa ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Flame className="w-4 h-4" />
        <span>{showRa ? 'RA: ON' : 'RA: OFF'}</span>
      </button>

      <button
        type="button"
        onClick={onOpenLogs}
        className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200"
      >
        <FileText className="w-4 h-4" />
        <span>Logs</span>
      </button>
    </div>
  );
}
