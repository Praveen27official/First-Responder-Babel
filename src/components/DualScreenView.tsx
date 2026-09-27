import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { CallSession, DemoScenario, TranscriptItem } from '../types.ts';
import { CallerView } from './CallerView.tsx';
import { OperatorView } from './OperatorView.tsx';

interface DualScreenViewProps {
  session: CallSession | null;
  scenarios: DemoScenario[];
  onAudioReceived?: (item: TranscriptItem) => void;
}

export const DualScreenView: React.FC<DualScreenViewProps> = ({
  session,
  scenarios,
  onAudioReceived,
}) => {
  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-4 max-w-[1600px] mx-auto w-full">
      {/* Left Column: Caller Mobile View Frame (5 Cols on XL) */}
      <div className="xl:col-span-5 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Smartphone className="w-4 h-4 text-red-400" />
            <span>Caller Screen (Distressed Citizen Handheld)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Mobile Simulated</span>
        </div>

        {/* Mobile Device Frame */}
        <div className="w-full max-w-[440px] rounded-3xl border-4 border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[740px]">
          {/* Simulated Mobile Status Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>11:24</span>
            <div className="w-16 h-3 bg-slate-950 rounded-full mx-auto" />
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <span className="w-3 h-2 border border-slate-400 rounded-xs inline-block" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <CallerView
              session={session}
              scenarios={scenarios}
              onAudioReceived={onAudioReceived}
              isCompact={true}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Operator Dispatch Workstation (7 Cols on XL) */}
      <div className="xl:col-span-7 flex flex-col">
        <div className="w-full flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>Emergency 112 Dispatch Workstation (First Responder)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Real-time Bridge Active</span>
        </div>

        <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-2xl min-h-[740px] flex flex-col">
          <OperatorView session={session} />
        </div>
      </div>
    </div>
  );
};
