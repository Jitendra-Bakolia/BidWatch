import React from 'react';
import {
  FileText,
  KeyRound,
  RefreshCw,
  Zap,
  Search,
  Bookmark,
  Menu,
  Shield,
  Clock
} from 'lucide-react';

export function Header({
  onOpenLogs,
  onOpenCreds,
  onOpenSearch,
  onOpenShortlist,
  onOpenMobileNav,
  onSyncAll,
  onRefresh,
  isSyncing,
  shortlistCount,
  isLive,
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-600/30 shrink-0">
            🏛️
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                GeM Tenders Portal
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                Last 24h Active
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-400 truncate mt-0.5">
              Official Government e-Marketplace Bids • Live 24-Hour Scraper, Filter & Intelligence
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/80 transition-all shadow-sm"
            title="Search tenders (Cmd/Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-400">⌘K</kbd>
          </button>

          {/* Shortlisted Drawer Button */}
          <button
            onClick={onOpenShortlist}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-all"
            title="View Shortlisted Tenders"
          >
            <Bookmark className="w-3.5 h-3.5 fill-amber-400/30 text-amber-400" />
            <span className="hidden xs:inline">Shortlisted</span>
            {shortlistCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-black rounded-full">
                {shortlistCount}
              </span>
            )}
          </button>

          {/* Live System Logs Button */}
          <button
            onClick={onOpenLogs}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Live Logs</span>
          </button>

          {/* Account & Credentials */}
          <button
            onClick={onOpenCreds}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-all"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span>GeM Account</span>
          </button>

          {/* Sync 24 Hours Button */}
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 rounded-lg shadow-md shadow-blue-600/20 transition-all"
          >
            <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync 24h'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all"
            title="Refresh current tender list"
            aria-label="Refresh tenders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
