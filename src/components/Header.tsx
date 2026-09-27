import React from 'react';
import { PhoneCall, RotateCcw, Monitor, Smartphone, Radio } from 'lucide-react';
import { CallSession } from '../types.ts';

interface HeaderProps {
  viewMode: 'dual' | 'caller' | 'operator';
  setViewMode: (mode: 'dual' | 'caller' | 'operator') => void;
  session: CallSession | null;
  onReset: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  session,
  onReset,
  isResetting,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Zone 1: Single text element wordmark with emergency indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>First-Responder Babel</span>
              <span className="text-[10px] font-mono font-normal tracking-wide text-red-400 uppercase bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded">
                112 Helpline
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: View Switcher Tabs (Functional filter controls) */}
        <nav className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => setViewMode('dual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'dual'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Dual Console</span>
          </button>
          <button
            onClick={() => setViewMode('caller')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'caller'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Caller View</span>
          </button>
          <button
            onClick={() => setViewMode('operator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'operator'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Operator View</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Active Call Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono text-slate-300 font-medium">Live Bridge</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="font-mono text-slate-400">{session?.id || 'call-112'}</span>
          </div>

          <button
            onClick={onReset}
            disabled={isResetting}
            title="Reset active call session"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">New Call</span>
          </button>
        </div>
      </div>
    </header>
  );
};
