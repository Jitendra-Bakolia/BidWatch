import React from 'react';
import {
  X,
  Clock,
  Star,
  Layers,
  AlertCircle,
  Gem,
  Flame,
  FileText,
  KeyRound,
  Zap,
  ExternalLink,
} from 'lucide-react';

export function MobileNavDrawer({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  showRa,
  onToggleShowRa,
  onOpenLogs,
  onOpenCreds,
  onSyncAll,
  isSyncing,
  stats,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden transition-opacity"
      onClick={onClose}
    >
      <div
        className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#111827] border-r border-slate-800 p-5 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg shadow-md">
                🏛️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">GeM Tenders</h3>
                <p className="text-[11px] text-slate-400">Government e-Marketplace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Views */}
          <div className="space-y-1 mb-6">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Browse Categories
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTab('last24h');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'last24h'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Last 24 Hours</span>
              </div>
              <span className="font-mono text-[11px]">{stats.count24h}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('shortlisted');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'shortlisted'
                  ? 'bg-amber-500 text-black'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Shortlisted Bids</span>
              </div>
              <span className="font-mono text-[11px]">{stats.shortCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('all');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>All Loaded Bids</span>
              </div>
              <span className="font-mono text-[11px]">{stats.totalLoaded}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('closing');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'closing'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Closing in 24h</span>
              </div>
              <span className="font-mono text-[11px]">{stats.closingCount}</span>
            </button>
          </div>

          {/* Tools & System */}
          <div className="space-y-1 pt-4 border-t border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
              System & Actions
            </div>

            <button
              type="button"
              onClick={() => {
                onToggleShowRa(!showRa);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-purple-400" />
                <span>Show RA Tenders</span>
              </div>
              <span className="text-[11px] text-purple-400 font-bold">{showRa ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenLogs();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>System & Live Logs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenCreds();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              <span>GeM Account & Login</span>
            </button>
          </div>
        </div>

        {/* Footer Sync Button */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onSyncAll();
              onClose();
            }}
            disabled={isSyncing}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing GeM...' : 'Sync All 24h Tenders'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
