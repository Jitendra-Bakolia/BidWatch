import React from 'react';
import { Clock, Star, Layers, AlertCircle, Gem } from 'lucide-react';

export function KpiStrip({
  stats,
  activeTab,
  onSelectTab,
}) {
  const cards = [
    {
      id: 'last24h',
      label: 'Last 24 Hours',
      count: stats.count24h || 0,
      subtext: 'Published recently',
      icon: Clock,
      color: 'text-sky-400',
      activeBorder: 'border-sky-500/80 bg-sky-500/10',
      glow: 'kpi-card-glow-blue',
    },
    {
      id: 'shortlisted',
      label: 'Shortlisted',
      count: stats.shortCount || 0,
      subtext: 'Your starred tenders',
      icon: Star,
      color: 'text-amber-400',
      activeBorder: 'border-amber-500/80 bg-amber-500/10',
      glow: 'kpi-card-glow-amber',
    },
    {
      id: 'all',
      label: 'Total In View',
      count: stats.totalLoaded || 0,
      subtext: 'Active tender inventory',
      icon: Layers,
      color: 'text-slate-200',
      activeBorder: 'border-blue-500/80 bg-blue-500/10',
      glow: 'kpi-card-glow-blue',
    },
    {
      id: 'closing',
      label: 'Closing Soon',
      count: stats.closingCount || 0,
      subtext: 'Ending within 24h',
      icon: AlertCircle,
      color: 'text-rose-400',
      activeBorder: 'border-rose-500/80 bg-rose-500/10',
      glow: 'kpi-card-glow-rose',
    },
    {
      id: 'highvalue',
      label: 'High Value',
      count: stats.highValCount || 0,
      subtext: 'Major procurement bids',
      icon: Gem,
      color: 'text-purple-400',
      activeBorder: 'border-purple-500/80 bg-purple-500/10',
      glow: 'kpi-card-glow-purple',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-5">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isActive = activeTab === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectTab(card.id)}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
              isActive
                ? `${card.activeBorder} shadow-lg shadow-black/40`
                : 'bg-[#111827] border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
            } ${card.glow}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
                {card.label}
              </span>
              <IconComponent className={`w-4 h-4 ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
            </div>

            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${card.color}`}>
              {card.count.toLocaleString()}
            </div>

            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {card.subtext}
            </div>

            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
