import React, { useState } from 'react';
import {
  Star,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  FileQuestion,
  RotateCcw,
} from 'lucide-react';

export function TenderTable({
  tenders,
  shortlistedIds,
  onToggleShortlist,
  onOpenQuickView,
  onOpenNote,
  notes,
  onResetFilters,
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, bidNum) => {
    navigator.clipboard.writeText(bidNum || id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dStr) => {
    if (!dStr) return 'N/A';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dStr;
    }
  };

  if (tenders.length === 0) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center my-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Matching Tenders Found</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          No bids match your current query or filters.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="table-scroll-container mb-6">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#0f172a] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <th className="py-3 px-3 w-10 text-center">⭐</th>
            <th className="py-3 px-3 w-16">Type</th>
            <th className="py-3 px-3 w-40">Bid Number</th>
            <th className="py-3 px-4 min-w-[260px]">Item / Category</th>
            <th className="py-3 px-4 min-w-[180px]">Ministry / Dept</th>
            <th className="py-3 px-3 w-20 text-right">Quantity</th>
            <th className="py-3 px-3 w-28">End Date</th>
            <th className="py-3 px-3 w-32 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {tenders.map((tender) => {
            const isShortlisted = shortlistedIds.includes(tender.id);
            const isRa = tender.typeLabel === 'RA' || tender.bidType === 5 || tender.bidType === 2;
            const tenderNote = notes[tender.id];

            return (
              <tr
                key={tender.id}
                className={`hover:bg-slate-800/50 transition-colors ${
                  isShortlisted ? 'bg-amber-500/5' : ''
                }`}
              >
                {/* Star */}
                <td className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleShortlist(tender.id)}
                    className={`transition-transform hover:scale-110 ${
                      isShortlisted ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-current' : ''}`} />
                  </button>
                </td>

                {/* Type */}
                <td className="py-2.5 px-3">
                  <span
                    className={`tag-badge text-[10px] ${
                      isRa ? 'tag-ra' : 'tag-bid'
                    }`}
                  >
                    {isRa ? 'RA' : 'BID'}
                  </span>
                </td>

                {/* Bid Number */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sky-400 font-medium truncate">
                      {tender.bidNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(tender.id, tender.bidNumber)}
                      className="text-slate-500 hover:text-slate-300 p-0.5"
                      title="Copy Bid Number"
                    >
                      {copiedId === tender.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Item / Category */}
                <td className="py-2.5 px-4">
                  <div
                    onClick={() => onOpenQuickView(tender)}
                    className="font-medium text-slate-200 hover:text-blue-400 cursor-pointer line-clamp-1"
                    title={tender.categoryName}
                  >
                    {tender.categoryName}
                  </div>
                  {tenderNote && (
                    <div className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
                      📝 {tenderNote.text}
                    </div>
                  )}
                </td>

                {/* Ministry */}
                <td className="py-2.5 px-4 text-slate-400">
                  <div className="truncate text-slate-300 max-w-[200px]" title={tender.ministry}>
                    {tender.ministry || 'Not Specified'}
                  </div>
                  {tender.department && (
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {tender.department}
                    </div>
                  )}
                </td>

                {/* Quantity */}
                <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                  {Number(tender.quantity || 1).toLocaleString()}
                </td>

                {/* End Date */}
                <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                  {formatDate(tender.endDate)}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenNote(tender)}
                      className={`p-1 rounded transition-colors ${
                        tenderNote
                          ? 'text-amber-400 hover:bg-amber-400/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                      title={tenderNote ? 'Edit quotation note' : 'Add quotation note'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenQuickView(tender)}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white"
                    >
                      View
                    </button>

                    <a
                      href={tender.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-950/40 rounded border border-sky-800/40"
                      title="Download PDF"
                    >
                      <span>PDF</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
