import React from 'react';
import { Shield, ExternalLink, Heart, Server } from 'lucide-react';

export function Footer({ totalCount, isLive, cutoffTime }) {
  const formattedCutoff = cutoffTime
    ? new Date(cutoffTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Last 24 Hours';

  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-[#070a12] py-8 px-4 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            🏛️
          </div>
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <span>GeM Tenders Portal & Live Shortlisting Engine</span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">v2.0</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cutoff Timestamp: <span className="text-slate-300 font-mono">{formattedCutoff}</span> • {totalCount.toLocaleString()} total bids
            </p>
          </div>
        </div>

        {/* Center / Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
          <a
            href="https://bidplus.gem.gov.in/all-bids"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition-colors flex items-center gap-1"
          >
            <span>GeM BidPlus</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://gem.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition-colors flex items-center gap-1"
          >
            <span>Official Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://gem.gov.in/help"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition-colors"
          >
            Help & Guidelines
          </a>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Engine Status:</span>
          <span className="text-emerald-400 font-semibold">
            {isLive ? 'Live Scraper Online' : 'Cache / Offline Ready'}
          </span>
        </div>
      </div>
    </footer>
  );
}
