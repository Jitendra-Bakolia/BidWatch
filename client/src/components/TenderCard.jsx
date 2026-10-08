import React, { useState } from 'react';
import {
  Star,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Edit3,
  Calendar,
  Box,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';

export function TenderCard({
  tender,
  isShortlisted,
  onToggleShortlist,
  onOpenQuickView,
  onOpenNote,
  tenderNote,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tender.bidNumber || tender.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dStr) => {
    if (!dStr) return 'N/A';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dStr;
    }
  };

  const isRa = tender.typeLabel === 'RA' || tender.bidType === 5 || tender.bidType === 2;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 flex flex-col justify-between p-4 bg-[#111827] relative group ${
        isShortlisted
          ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-[#111827] shadow-md shadow-amber-950/20'
          : 'border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-black/50'
      }`}
    >
      <div>
        {/* Header Row: Badges and Bookmark */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`tag-badge ${
                isRa ? 'tag-ra' : 'tag-bid'
              }`}
            >
              {isRa ? '⚡ RA' : '📄 BID'}
            </span>

            {tender.isWithin24Hours && (
              <span className="tag-badge tag-24h">24h Recent</span>
            )}

            {tender.isClosingIn24Hours && (
              <span className="tag-badge tag-closing">Closing Soon</span>
            )}

            {tender.isHighValue && (
              <span className="tag-badge tag-high-value">High Value</span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleShortlist(tender.id);
            }}
            className={`p-1.5 rounded-lg transition-transform hover:scale-110 ${
              isShortlisted
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-500 hover:text-amber-400'
            }`}
            title={isShortlisted ? 'Remove from shortlist' : 'Shortlist tender'}
          >
            <Star className={`w-4 h-4 ${isShortlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Bid Number with Copy */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="font-mono text-xs font-bold text-sky-400">
            {tender.bidNumber}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
            title="Copy Bid Number"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Item Description / Category Name */}
        <h3
          onClick={() => onOpenQuickView(tender)}
          className="text-sm font-semibold text-slate-100 line-clamp-2 hover:text-blue-400 cursor-pointer transition-colors leading-snug mb-3"
          title={tender.categoryName}
        >
          {tender.categoryName || 'Item description not specified'}
        </h3>

        {/* Metadata Details Grid */}
        <div className="bg-[#0f172a] rounded-lg p-3 grid grid-cols-2 gap-2 text-xs mb-3 border border-slate-800/60">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center gap-1">
              <Box className="w-3 h-3 text-slate-400" />
              Quantity
            </div>
            <div className="font-semibold text-slate-200">
              {Number(tender.quantity || 1).toLocaleString()} units
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              End Date
            </div>
            <div className="font-semibold text-slate-200 truncate">
              {formatDate(tender.endDate)}
            </div>
          </div>
        </div>

        {/* Ministry & Department */}
        <div className="text-xs text-slate-400 mb-3 flex items-start gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-medium text-slate-300 truncate">
              {tender.ministry || 'Not Specified'}
            </div>
            {tender.department && (
              <div className="text-[11px] text-slate-400 truncate">
                {tender.department}
              </div>
            )}
          </div>
        </div>

        {/* Internal Note Preview if present */}
        {tenderNote && (
          <div className="bg-amber-500/10 border-l-2 border-amber-500 rounded-r-md p-2 text-xs text-amber-300 mb-3 line-clamp-2">
            <span className="font-bold text-[10px] uppercase block text-amber-400">Quotation / Internal Note:</span>
            {tenderNote.text}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenNote(tender)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            tenderNote
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Add or edit notes"
        >
          <Edit3 className="w-3 h-3" />
          <span>{tenderNote ? 'Edit Note' : 'Add Note'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenQuickView(tender)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded transition-colors"
          >
            Details
          </button>

          <a
            href={tender.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/40 rounded transition-colors"
            title="Download Official GeM Document / PDF"
          >
            <span>PDF</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
