import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Volume2,
  MapPin,
  Clock,
  Globe,
  Radio,
  Download,
  AlertTriangle,
  Flame,
  HeartPulse,
  Car,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { CallSession, TranscriptItem } from '../types.ts';
import { sendOperatorReply, updateSession, playAudio } from '../services/api.ts';

interface OperatorViewProps {
  session: CallSession | null;
  onRefresh?: () => void;
}

export const OperatorView: React.FC<OperatorViewProps> = ({ session }) => {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Call duration counter
  useEffect(() => {
    if (!session?.createdAt) return;
    const interval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - session.createdAt) / 1000);
      const mins = Math.floor(diffSec / 60)
        .toString()
        .padStart(2, '0');
      const secs = (diffSec % 60).toString().padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.createdAt]);

  // Scroll to bottom when new transcript arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.transcripts.length]);

  // Quick emergency dispatch presets
  const quickResponses = [
    {
      title: 'Ambulance En Route',
      text: 'An emergency cardiac ambulance has been dispatched to your GPS location with oxygen and AED. Keep the patient lying flat.',
      icon: HeartPulse,
    },
    {
      title: 'Fire Tender Dispatched',
      text: 'Fire tender units 4 and 5 are en route. Evacuate the premises immediately and stay clear of gas cylinders.',
      icon: Flame,
    },
    {
      title: 'Highway Trauma Patrol',
      text: 'Highway patrol and trauma response teams are arriving in 5 minutes. Do not move heavily injured persons unless danger is imminent.',
      icon: Car,
    },
    {
      title: 'Calm Reassurance',
      text: 'Stay on the line with me. First responders are on their way to your exact location.',
      icon: ShieldCheck,
    },
  ];

  async function handleSendReply(customText?: string) {
    const textToSend = (customText || replyText).trim();
    if (!textToSend || !session) return;

    setErrorMessage(null);
    setIsSending(true);
    try {
      await sendOperatorReply(textToSend, session.id);
      if (!customText) {
        setReplyText('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reply to caller');
    } finally {
      setIsSending(false);
    }
  }

  function handlePlayAudio(item: TranscriptItem) {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    const source = item.audioBase64 || item.audioUrl;
    if (source) {
      setPlayingAudioId(item.id);
      const audio = playAudio(source);
      currentAudioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
    }
  }

  function handleOperatorLanguageChange(lang: 'en-IN' | 'hi-IN') {
    if (session) {
      updateSession(session.id, { operatorLanguage: lang }).catch(console.error);
    }
  }

  function exportTranscript() {
    if (!session) return;
    const content = JSON.stringify(session, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `first-responder-babel-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const callerLang = session?.callerLanguage;
  const latencies = session?.latencies || {};

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 sm:p-6">
      {/* Top Dispatch Console Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 mb-4 shadow-sm">
        {/* Call Identity & Duration */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-wide">
                {session?.id || 'CALL-112'}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Active Call
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums font-semibold text-slate-200">{elapsedTime}</span>
            </div>
          </div>
        </div>

        {/* Auto-Detected Language */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-800/50 flex items-center justify-center text-sky-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-mono">
              Caller Language
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <span>{callerLang ? callerLang.name : 'Listening to caller...'}</span>
              {callerLang && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/40">
                  {callerLang.confidence}% Match
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GPS Location & Geo-fence */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-amber-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="truncate">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-mono">
              Cellular GPS Location
            </span>
            <span className="text-xs font-medium text-slate-200 truncate block">
              {session?.callerLocation.address || 'Triangulating Location...'}
            </span>
          </div>
        </div>

        {/* Operator Working Language Switcher */}
        <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
          <span className="text-xs text-slate-400 shrink-0">Operator Lang:</span>
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => handleOperatorLanguageChange('en-IN')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                session?.operatorLanguage === 'en-IN'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleOperatorLanguageChange('hi-IN')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                session?.operatorLanguage === 'hi-IN'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left Column (2 Cols): Live Captions & Conversation Timeline */}
        <div className="lg:col-span-2 flex flex-col rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          {/* Timeline Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                Live Bilingual Caption Stream
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({session?.transcripts.length || 0} turns)
              </span>
            </div>
            <button
              onClick={exportTranscript}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(!session?.transcripts || session.transcripts.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <AlertTriangle className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">Waiting for caller voice input...</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  The caller can tap their microphone or choose one of the one-tap emergency scenarios. Incoming speech will instantly transcribe and translate here.
                </p>
              </div>
            )}

            {session?.transcripts.map((t) => {
              const isCaller = t.sender === 'caller';
              const hasAudio = !!(t.audioBase64 || t.audioUrl);
              const isAudioPlaying = playingAudioId === t.id;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col ${isCaller ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl p-3.5 border ${
                      isCaller
                        ? 'bg-slate-950/80 border-slate-800 text-slate-100'
                        : 'bg-blue-950/40 border-blue-900/60 text-blue-50'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-4 mb-1.5 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {isCaller ? 'Caller (Distress Call)' : 'Operator (You)'}
                      </span>
                      <div className="flex items-center gap-2">
                        {t.latencies && (
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-900/60">
                            ⚡ {t.latencies.totalMs}ms
                          </span>
                        )}
                        <span className="font-mono text-[10px]">
                          {new Date(t.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Primary Translation for Operator */}
                    <div className="mb-2">
                      <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                        {t.translatedText}
                      </p>
                    </div>

                    {/* Original Language Speech in Native Script */}
                    {t.originalText && t.originalText !== t.translatedText && (
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-xs text-slate-300 mt-2">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                          Original {t.originalLanguageName}:
                        </span>
                        <p className="font-sans leading-relaxed text-slate-200">
                          {t.originalText}
                        </p>
                      </div>
                    )}

                    {/* Audio Playback control */}
                    {hasAudio && (
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
                        <button
                          onClick={() => handlePlayAudio(t)}
                          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isAudioPlaying ? 'animate-bounce' : ''}`} />
                          <span>{isAudioPlaying ? 'Playing Audio...' : 'Listen to Audio'}</span>
                        </button>
                        <span className="text-slate-400 text-[10px] font-mono">
                          {isCaller ? 'Caller Recording' : 'Sarvam TTS Output'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Dispatch Presets */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-2">
              Quick Dispatch Protocols
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickResponses.map((qr, idx) => {
                const Icon = qr.icon;
                return (
                  <button
                    key={idx}
                    disabled={isSending}
                    onClick={() => handleSendReply(qr.text)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors disabled:opacity-50"
                  >
                    <Icon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate text-slate-200 font-medium">{qr.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operator Reply Console Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900">
            {errorMessage && (
              <div className="mb-2 p-2 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {errorMessage}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendReply();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  session?.operatorLanguage === 'hi-IN'
                    ? 'कॉलर के लिए निर्देश टाइप करें (जैसे: एम्बुलेंस निकल चुकी है)...'
                    : 'Type instruction for caller in English (e.g. Ambulance is 4 minutes away)...'
                }
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send & Voice</span>
                  </>
                )}
              </button>
            </form>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>Transmitted directly as translated voice audio to caller screen</span>
              <span className="font-mono">Sarvam Translate + Bulbul TTS</span>
            </div>
          </div>
        </div>

        {/* Right Column: Mission Control & Latency Telemetry */}
        <div className="space-y-4">
          {/* Latency & Real-Time Performance Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Latency Telemetry
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Target &le; 4.0s</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">STT-Translate (Saaras v3)</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {latencies.lastSttMs ? `${latencies.lastSttMs}ms` : '—'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, ((latencies.lastSttMs || 0) / 2500) * 100)}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Text Translate (Mayura v1)</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {latencies.lastTransMs ? `${latencies.lastTransMs}ms` : '—'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, ((latencies.lastTransMs || 0) / 2000) * 100)}%` }}
                    className="h-full bg-sky-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Voice Synthesis (Bulbul v3)</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {latencies.lastTtsMs ? `${latencies.lastTtsMs}ms` : '—'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, ((latencies.lastTtsMs || 0) / 2000) * 100)}%` }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Round-trip Total</span>
                <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                  {latencies.totalRoundtripMs ? `${(latencies.totalRoundtripMs / 1000).toFixed(2)}s` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Dispatch Action Panel */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-white uppercase tracking-wider block mb-3 border-b border-slate-800 pb-2">
              Dispatch Resource Status
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-slate-200">ALS Ambulance 12</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                  En Route (6 min)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-slate-200">Fire Tender Station 4</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  On Standby
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-sky-400" />
                  <span className="font-medium text-slate-200">Highway Patrol Interceptor</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  Dispatched
                </span>
              </div>
            </div>
          </div>

          {/* Architecture Pipeline Explanation */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block mb-1">
              Sarvam AI Pipeline Architecture
            </span>
            <div className="flex items-start gap-2">
              <span className="font-mono text-red-400 font-bold">1.</span>
              <p>Speech-to-Text Translate: Transcribes & translates Indian regional speech directly to English.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-sky-400 font-bold">2.</span>
              <p>Text LID: Auto-detects caller regional language from speech tokens.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-amber-400 font-bold">3.</span>
              <p>Text Translate: Translates operator instruction back into caller language.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">4.</span>
              <p>Text-to-Speech: Converts translated reply into human voice audio played to caller.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
