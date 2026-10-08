import React from 'react';
import { Activity, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

export function AnnouncementBar({ tenderCount, isLive, lastUpdated }) {
  return (
    <aside aria-label="Announcement" className="w-full bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/30 text-xs py-2 px-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-sky-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-sky-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            {isLive ? 'GeM Live Scraper Connected' : 'GeM Portal Standalone Mode'}
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:inline text-slate-300">
            Scanning all government tenders published in the last 24 hours ({tenderCount.toLocaleString()} tenders tracked)
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="hidden md:inline text-[11px]">
            Official GeM Bidplus Engine
          </span>
          <a
            href="https://bidplus.gem.gov.in/all-bids"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium text-[11px]"
          >
            <span>bidplus.gem.gov.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );
}
