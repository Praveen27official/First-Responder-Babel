export interface TranscriptItem {
  id: string;
  sender: 'caller' | 'operator';
  timestamp: number;
  originalText: string;
  originalLanguage: string;
  originalLanguageName: string;
  translatedText: string;
  translatedLanguage: string;
  translatedLanguageName: string;
  audioBase64?: string;
  audioUrl?: string;
  latencies?: {
    sttMs?: number;
    transMs?: number;
    ttsMs?: number;
    totalMs: number;
  };
}

export interface CallSession {
  id: string;
  createdAt: number;
  status: 'idle' | 'calling' | 'connected' | 'ended';
  callerLocation: {
    address: string;
    lat: number;
    lng: number;
    district: string;
  };
  callerLanguage: {
    code: string;
    name: string;
    script?: string;
    confidence: number;
  } | null;
  operatorLanguage: 'en-IN' | 'hi-IN';
  category: 'medical' | 'fire' | 'accident' | 'general';
  transcripts: TranscriptItem[];
  latencies: {
    lastSttMs?: number;
    lastTransMs?: number;
    lastTtsMs?: number;
    totalRoundtripMs?: number;
  };
}

export interface DemoScenario {
  id: string;
  name: string;
  emergencyType: 'medical' | 'fire' | 'accident';
  callerLanguage: string;
  callerLanguageCode: string;
  speaker: string;
  operatorLanguage: string;
  operatorLanguageCode: string;
  callerUtterance: string;
  operatorReply: string;
}
