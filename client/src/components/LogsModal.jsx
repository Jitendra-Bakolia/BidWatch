import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Terminal, Activity } from 'lucide-react';
import { fetchSystemLogs } from '../services/gemApi';

export function LogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const terminalEndRef = useRef(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logItems = await fetchSystemLogs();
      setLogs(logItems || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      const interval = setInterval(loadLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const getTagColor = (level, tag) => {
    switch (level?.toLowerCase()) {
      case 'gem':
        return 'text-purple-400';
      case 'http':
        return 'text-sky-400';
      case 'info':
        return 'text-emerald-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-slate-700 rounded-2xl max-w-3xl w-full p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Live System & GeM Sync Logs</h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Tail
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Log stream from <code className="text-sky-400 font-mono">gem-tenders.log</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal logs container */}
        <div className="bg-[#030712] border border-slate-800/80 rounded-xl p-3.5 h-[420px] overflow-y-auto terminal-scroll font-mono text-[11px] leading-relaxed space-y-1.5 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-10">No log entries found.</div>
          ) : (
            logs.map((log, i) => (
              <div key={log.id || i} className="flex items-start gap-2 text-slate-300 break-all">
                <span className="text-slate-600 shrink-0 select-none">[{log.time || '00:00:00'}]</span>
                <span className={`font-bold shrink-0 ${getTagColor(log.level, log.tag)}`}>
                  [{log.tag || 'SYS'}]
                </span>
                <span className="text-slate-200">{log.message}</span>
                {log.extra && (
                  <span className="text-slate-500 text-[10px]">
                    {typeof log.extra === 'object' ? JSON.stringify(log.extra) : String(log.extra)}
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-4 text-xs text-slate-400">
          <span>Displaying last {logs.length} system events</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
