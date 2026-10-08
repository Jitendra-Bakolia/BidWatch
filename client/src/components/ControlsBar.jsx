import React from 'react';
import {
  Search,
  Download,
  LayoutGrid,
  List,
  Filter,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { SORT_OPTIONS, TYPE_OPTIONS } from '../data/mockData';

export function ControlsBar({
  searchQuery,
  onSearchChange,
  activeTab,
  onSelectTab,
  selectedType,
  onTypeChange,
  selectedMinistry,
  onMinistryChange,
  ministriesList,
  selectedSort,
  onSortChange,
  viewMode,
  onToggleViewMode,
  onExportCsv,
  filteredCount,
  tabCounts,
}) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 mb-5 shadow-lg shadow-black/30 space-y-3.5">
      {/* Top Row: Search and Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by item, bid number (GEM/2026/...), ministry, department..."
            className="w-full bg-[#0f172a] border border-slate-700/80 rounded-lg pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectTab('last24h')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'last24h'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🕒 Last 24 Hours ({tabCounts.count24h || 0})
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('shortlisted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'shortlisted'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⭐ Shortlisted ({tabCounts.shortCount || 0})
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Loaded Bids
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('closing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'closing'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⏳ Closing Soon
          </button>
        </div>
      </div>

      {/* Bottom Row: Filter Dropdowns, Sort, Export, and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ministry Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Ministry:</span>
            <select
              value={selectedMinistry}
              onChange={(e) => onMinistryChange(e.target.value)}
              className="bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 max-w-[210px] truncate cursor-pointer"
            >
              {ministriesList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Toggle & Export CSV */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV ({filteredCount.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={onToggleViewMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all"
            title="Toggle between Card Grid and Data Table"
          >
            {viewMode === 'grid' ? (
              <>
                <List className="w-3.5 h-3.5 text-sky-400" />
                <span>Table View</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                <span>Grid View</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
