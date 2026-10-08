import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export function MainLoader({ message = 'Loading GeM Live Bids...' }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl shadow-xl shadow-blue-600/30">
          🏛️
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0b0f19] border-2 border-slate-800 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-sky-400" />
        {message}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm">
        Communicating with GeM portal (bidplus.gem.gov.in) and compiling 24-hour procurement listings...
      </p>
    </div>
  );
}
