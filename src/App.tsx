import { useState, useEffect, useCallback } from 'react';
import { CallSession, DemoScenario, TranscriptItem } from './types.ts';
import { fetchSession, fetchScenarios, resetSession, subscribeToSession } from './services/api.ts';
import { Header } from './components/Header.tsx';
import { DualScreenView } from './components/DualScreenView.tsx';
import { CallerView } from './components/CallerView.tsx';
import { OperatorView } from './components/OperatorView.tsx';

export default function App() {
  const [viewMode, setViewMode] = useState<'dual' | 'caller' | 'operator'>('dual');
  const [session, setSession] = useState<CallSession | null>(null);
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session and scenarios
  useEffect(() => {
    async function init() {
      try {
        const [sess, scens] = await Promise.all([
          fetchSession(),
          fetchScenarios(),
        ]);
        setSession(sess);
        setScenarios(scens);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Subscribe to real-time SSE stream
  useEffect(() => {
    const unsubscribe = subscribeToSession(
      'call-112-alpha',
      (updatedSession) => {
        setSession(updatedSession);
      },
      (newAudioItem) => {
        console.log('Incoming audio event received:', newAudioItem.id);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      const reset = await resetSession('call-112-alpha', session?.operatorLanguage || 'en-IN');
      setSession(reset);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  }, [session?.operatorLanguage]);

  if (isLoading && !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin mb-3" />
        <span>Initializing First-Responder Babel...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        session={session}
        onReset={handleReset}
        isResetting={isResetting}
      />

      <main className="flex-1 flex flex-col">
        {viewMode === 'dual' && (
          <DualScreenView
            session={session}
            scenarios={scenarios}
          />
        )}

        {viewMode === 'caller' && (
          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col p-4 sm:p-6">
            <CallerView
              session={session}
              scenarios={scenarios}
            />
          </div>
        )}

        {viewMode === 'operator' && (
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            <OperatorView session={session} />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2.5 text-center text-xs text-slate-600">
        <p>
          First-Responder Babel · Powered by Sarvam AI (Speech-to-Text Translate, Language Identification, Text Translation, Bulbul TTS)
        </p>
      </footer>
    </div>
  );
}
