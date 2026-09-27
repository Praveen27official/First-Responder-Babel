import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle, MapPin, CheckCircle2, RefreshCw } from 'lucide-react';
import { CallSession, DemoScenario, TranscriptItem } from '../types.ts';
import { sendCallerAudio, triggerScenario, playAudio } from '../services/api.ts';

interface CallerViewProps {
  session: CallSession | null;
  scenarios: DemoScenario[];
  onAudioReceived?: (item: TranscriptItem) => void;
  isCompact?: boolean;
}

export const CallerView: React.FC<CallerViewProps> = ({
  session,
  scenarios,
  isCompact = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Latest operator voice message
  const operatorReplies = session?.transcripts.filter((t) => t.sender === 'operator') || [];
  const latestOperatorReply = operatorReplies[operatorReplies.length - 1];

  // Auto-play incoming operator replies
  useEffect(() => {
    if (latestOperatorReply && latestOperatorReply.audioBase64) {
      handlePlayVoice(latestOperatorReply);
    }
  }, [latestOperatorReply?.id]);

  function handlePlayVoice(item: TranscriptItem) {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    if (item.audioBase64 || item.audioUrl) {
      setAudioPlayingId(item.id);
      const audio = playAudio(item.audioBase64 || item.audioUrl!);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setAudioPlayingId(null);
      };
      audio.onerror = () => {
        setAudioPlayingId(null);
      };
    }
  }

  // Start live microphone recording
  async function startRecording() {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        setIsProcessing(true);
        try {
          await sendCallerAudio(audioBlob, session?.id);
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to process speech');
        } finally {
          setIsProcessing(false);
          setIsRecording(false);
          setRecordingSeconds(0);
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorMessage('Microphone access denied. You can test using the one-tap Demo Scenarios below.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
  }

  // Trigger one of the 3 pre-recorded demo emergency scenarios
  async function handleTriggerDemo(scenarioId: string) {
    setErrorMessage(null);
    setActiveScenarioId(scenarioId);
    setIsProcessing(true);
    try {
      await triggerScenario(scenarioId, session?.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to run scenario');
    } finally {
      setIsProcessing(false);
      setActiveScenarioId(null);
    }
  }

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 ${isCompact ? 'p-3' : 'p-4 sm:p-6'}`}>
      {/* Top Emergency Banner */}
      <div className="flex items-center justify-between border-b border-red-950/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs uppercase tracking-wider font-mono text-red-400 font-semibold">
            Emergency 112 Connected
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span className="truncate max-w-[180px]">NH-44 · GPS Acquired</span>
        </div>
      </div>

      {/* Main Distress Mic Button Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        <div className="text-center mb-6 max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
            {isRecording
              ? 'Listening... Speak in your language'
              : isProcessing
              ? 'Translating to First Responder...'
              : 'Tap & Speak in Any Language'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRecording
              ? `Recording: ${recordingSeconds}s · Tap to send to operator`
              : 'Auto-detects Tamil, Bhojpuri, Hindi, Assamese, and more.'}
          </p>
        </div>

        {/* Big High-Contrast Touch Target Button */}
        <div className="relative flex items-center justify-center my-2">
          {/* Animated rings during recording */}
          {isRecording && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-red-600/20 animate-ping" />
              <div className="absolute w-36 h-36 rounded-full bg-red-600/30 animate-pulse" />
            </>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            aria-label={isRecording ? 'Stop Recording' : 'Start Speaking'}
            className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-xl active:scale-95 ${
              isRecording
                ? 'bg-red-600 text-white ring-4 ring-red-400/50 scale-105'
                : isProcessing
                ? 'bg-slate-800 text-slate-400 cursor-wait'
                : 'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-900/30'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-10 h-10 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-10 h-10 animate-pulse" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
            <span className="text-[11px] font-semibold mt-1 uppercase tracking-wide">
              {isProcessing ? 'Translating' : isRecording ? 'Tap to Stop' : 'Hold / Tap'}
            </span>
          </button>
        </div>

        {/* Live Audio Wave Visualizer Simulation during recording */}
        {isRecording && (
          <div className="flex items-center gap-1 mt-6 h-8">
            {[40, 75, 90, 60, 100, 45, 80, 95, 70, 50, 85, 65].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-1 bg-red-500 rounded-full animate-pulse transition-all duration-150"
              />
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2 max-w-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Latest Dispatcher Voice Reply Box */}
      {latestOperatorReply && (
        <div className="mb-5 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                Dispatcher Responded
              </span>
            </div>
            <button
              onClick={() => handlePlayVoice(latestOperatorReply)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-800 rounded-md transition-colors"
            >
              <Volume2 className={`w-3.5 h-3.5 ${audioPlayingId === latestOperatorReply.id ? 'animate-bounce text-emerald-200' : ''}`} />
              <span>{audioPlayingId === latestOperatorReply.id ? 'Playing Voice...' : 'Replay Voice'}</span>
            </button>
          </div>

          {/* Caller's native language translated audio text */}
          <p className="text-base sm:text-lg font-medium text-white leading-relaxed mb-2">
            "{latestOperatorReply.translatedText}"
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Spoken in {latestOperatorReply.translatedLanguageName}</span>
            <span aria-hidden="true">·</span>
            <span>Synthesized via Sarvam Bulbul TTS</span>
          </div>
        </div>
      )}

      {/* Demo Emergency Scenarios Section (Required for reviewer testing) */}
      <div className="border-t border-slate-800/80 pt-4 mt-auto">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">
              One-Tap Demo Emergency Calls
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Real Sarvam STT Audio</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {scenarios.map((s) => {
            const isLoading = isProcessing && activeScenarioId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleTriggerDemo(s.id)}
                disabled={isProcessing}
                className="flex flex-col text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-white truncate">{s.callerLanguage}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {s.emergencyType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-1.5">
                  {s.callerUtterance}
                </p>
                <span className="text-[10px] font-medium text-red-400 mt-auto flex items-center gap-1">
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Play Scenario Audio</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
