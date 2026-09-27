import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import http from 'http';
import multer from 'multer';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-Memory Emergency Helpline Sessions
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

const sessions = new Map<string, CallSession>();
const sseClients = new Map<string, Set<Response>>();

// Language code to human display name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'ta-IN': 'Tamil (தமிழ்)',
  'hi-IN': 'Hindi (हिन्दी)',
  'as-IN': 'Assamese (অসমীয়া)',
  'bn-IN': 'Bengali (বাংলা)',
  'te-IN': 'Telugu (తెలుగు)',
  'kn-IN': 'Kannada (ಕನ್ನಡ)',
  'mr-IN': 'Marathi (मराठी)',
  'gu-IN': 'Gujarati (ગુજરાતી)',
  'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
  'ml-IN': 'Malayalam (മലയാളം)',
  'od-IN': 'Odia (ଓଡ଼ିଆ)',
  'en-IN': 'English (Indian)',
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

function broadcastSessionUpdate(sessionId: string, session: CallSession) {
  const clients = sseClients.get(sessionId);
  if (clients && clients.size > 0) {
    const payload = `event: session_update\ndata: ${JSON.stringify(session)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (e) {
        clients.delete(res);
      }
    }
  }
}

function broadcastAudioEvent(sessionId: string, item: TranscriptItem) {
  const clients = sseClients.get(sessionId);
  if (clients && clients.size > 0) {
    const payload = `event: new_audio\ndata: ${JSON.stringify(item)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (e) {
        clients.delete(res);
      }
    }
  }
}

function getOrCreateSession(sessionId = 'call-112-alpha'): CallSession {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      createdAt: Date.now(),
      status: 'connected',
      callerLocation: {
        address: 'National Highway 44, Near Km Stone 82',
        lat: 12.9716,
        lng: 77.5946,
        district: 'Command Region Alpha',
      },
      callerLanguage: null,
      operatorLanguage: 'en-IN',
      category: 'medical',
      transcripts: [],
      latencies: {},
    };
    sessions.set(sessionId, session);
  }
  return session;
}

// Ensure default session exists
getOrCreateSession('call-112-alpha');

// 1. Session SSE stream for real-time live synchronization
app.get('/api/session/:id/stream', (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = getOrCreateSession(sessionId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(sessionId)) {
    sseClients.set(sessionId, new Set());
  }
  sseClients.get(sessionId)!.add(res);

  // Send initial state immediately
  res.write(`event: session_update\ndata: ${JSON.stringify(session)}\n\n`);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(sessionId)?.delete(res);
  });
});

// 2. Get session state
app.get('/api/session/:id', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.id);
  res.json(session);
});

// 3. Reset session
app.post('/api/session/:id/reset', (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session: CallSession = {
    id: sessionId,
    createdAt: Date.now(),
    status: 'connected',
    callerLocation: {
      address: 'Simulated Cellular Location (Triangulated)',
      lat: 12.9716,
      lng: 77.5946,
      district: 'District Emergency Center',
    },
    callerLanguage: null,
    operatorLanguage: (req.body.operatorLanguage as any) || 'en-IN',
    category: 'general',
    transcripts: [],
    latencies: {},
  };
  sessions.set(sessionId, session);
  broadcastSessionUpdate(sessionId, session);
  res.json(session);
});

// 4. Update session operator language / category
app.patch('/api/session/:id', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.id);
  if (req.body.operatorLanguage) {
    session.operatorLanguage = req.body.operatorLanguage;
  }
  if (req.body.category) {
    session.category = req.body.category;
  }
  broadcastSessionUpdate(session.id, session);
  res.json(session);
});

// 5. Pre-recorded demo scenarios list
app.get('/api/scenarios', (_req: Request, res: Response) => {
  const scenariosPath = path.resolve('src/data/scenarios.json');
  if (fs.existsSync(scenariosPath)) {
    const raw = fs.readFileSync(scenariosPath, 'utf8');
    res.json(JSON.parse(raw));
  } else {
    res.json([]);
  }
});

// 6. Play demo scenario directly through Sarvam API
app.post('/api/session/:id/scenario', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = getOrCreateSession(sessionId);
  const { scenarioId } = req.body;

  const audioMap: Record<string, { file: string; langCode: string; name: string; nativeText: string; category: CallSession['category'] }> = {
    'tamil-medical': {
      file: 'public/demo_audio/tamil-medical.wav',
      langCode: 'ta-IN',
      name: 'Tamil',
      nativeText: 'எனக்கு நெஞ்சு வலி அதிகமாக இருக்கிறது, மூச்சு விட முடியவில்லை. என் அப்பா மயங்கி விழுந்துவிட்டார்! தயவுசெய்து உடனடியாக ஆம்புலன்ஸ் அனுப்புங்கள்!',
      category: 'medical',
    },
    'bhojpuri-fire': {
      file: 'public/demo_audio/bhojpuri-fire.wav',
      langCode: 'hi-IN',
      name: 'Bhojpuri / Hindi',
      nativeText: 'अरे भइया जल्दी आओ! हमनी के दुकान में आग लग गइल बा! सिलेंडर फटे के डर बा, बहुत तेज धुआँ उठ रहल बा!',
      category: 'fire',
    },
    'assamese-accident': {
      file: 'public/demo_audio/assamese-accident.wav',
      langCode: 'as-IN',
      name: 'Assamese',
      nativeText: 'ৰাষ্ট্ৰীয় ঘাইপথত এখন ডাঙৰ গাড়ী আৰু বাছৰ মুখামুখি সংঘৰ্ষ হৈছে! বহুতো মানুহ আহত হৈছে, তেজ ওলাইছে, সোনকালে পুলিচ আৰু এম্বুলেন্স পঠিয়াওক!',
      category: 'accident',
    },
  };

  const scenario = audioMap[scenarioId];
  if (!scenario) {
    return res.status(400).json({ error: 'Unknown scenario ID' });
  }

  session.category = scenario.category;

  const filePath = path.resolve(scenario.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  const audioBuffer = fs.readFileSync(filePath);
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });

  const sttStart = performance.now();
  let translatedText = '';
  let detectedLang = scenario.langCode;
  let confidence = 0.95;

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'caller.wav');
    formData.append('model', 'saaras:v3');
    formData.append('mode', 'translate');

    const sttRes = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
      },
      body: formData,
    });

    if (sttRes.ok) {
      const sttData = await sttRes.json();
      translatedText = sttData.transcript || '';
      detectedLang = sttData.language_code || scenario.langCode;
      confidence = sttData.language_probability || 0.95;
    } else {
      console.warn('STT call status:', sttRes.status, await sttRes.text());
      // Fallback to translated text based on scenario
      translatedText = scenarioId === 'tamil-medical'
        ? "I have severe chest pain and cannot breathe. My father has collapsed unconscious! Please send an ambulance immediately!"
        : scenarioId === 'bhojpuri-fire'
        ? "Brother, come quickly! A fire has broken out in our shop! There is danger of cylinder explosion, thick smoke is rising!"
        : "A major collision between a car and bus happened on the National Highway! Several people are injured and bleeding, send police and ambulance!";
    }
  } catch (err: any) {
    console.error('STT API error:', err);
    translatedText = "Urgent assistance requested at caller location!";
  }

  const sttMs = Math.round(performance.now() - sttStart);

  // If operator language is Hindi and output is English, translate into Hindi
  let finalOperatorTranscript = translatedText;
  let transMs = 0;
  if (session.operatorLanguage === 'hi-IN' && detectedLang !== 'hi-IN') {
    const transStart = performance.now();
    try {
      const transRes = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': SARVAM_API_KEY,
        },
        body: JSON.stringify({
          input: translatedText,
          source_language_code: 'en-IN',
          target_language_code: 'hi-IN',
        }),
      });
      if (transRes.ok) {
        const transData = await transRes.json();
        finalOperatorTranscript = transData.translated_text || translatedText;
      }
    } catch (e) {
      console.error('Hindi translation error:', e);
    }
    transMs = Math.round(performance.now() - transStart);
  }

  // Update session language
  session.callerLanguage = {
    code: detectedLang,
    name: scenario.name,
    confidence: Math.round(confidence * 100),
  };

  const transcriptItem: TranscriptItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender: 'caller',
    timestamp: Date.now(),
    originalText: scenario.nativeText,
    originalLanguage: detectedLang,
    originalLanguageName: scenario.name,
    translatedText: finalOperatorTranscript,
    translatedLanguage: session.operatorLanguage,
    translatedLanguageName: getLanguageName(session.operatorLanguage),
    audioUrl: `/demo_audio/${path.basename(scenario.file)}`,
    latencies: {
      sttMs,
      transMs,
      totalMs: sttMs + transMs,
    },
  };

  session.transcripts.push(transcriptItem);
  session.latencies = {
    lastSttMs: sttMs,
    lastTransMs: transMs,
    totalRoundtripMs: sttMs + transMs,
  };

  broadcastSessionUpdate(sessionId, session);
  res.json({ session, transcriptItem });
});

// 7. Process live mic audio from Caller
app.post('/api/session/:id/caller-audio', upload.single('audio'), async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = getOrCreateSession(sessionId);

  let audioBuffer: Buffer | null = null;
  let mimeType = 'audio/wav';

  if (req.file) {
    audioBuffer = req.file.buffer;
    mimeType = req.file.mimetype || 'audio/wav';
  } else if (req.body.audioBase64) {
    audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
    mimeType = req.body.mimeType || 'audio/wav';
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    return res.status(400).json({ error: 'No audio data received' });
  }

  const sttStart = performance.now();
  let translatedText = '';
  let detectedLang = 'hi-IN';
  let confidence = 0.9;

  try {
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', audioBlob, 'caller-voice.wav');
    formData.append('model', 'saaras:v3');
    formData.append('mode', 'translate');

    const sttRes = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
      },
      body: formData,
    });

    if (sttRes.ok) {
      const sttData = await sttRes.json();
      translatedText = sttData.transcript || '';
      detectedLang = sttData.language_code || 'hi-IN';
      confidence = sttData.language_probability || 0.85;
    } else {
      const errText = await sttRes.text();
      console.error('Sarvam STT failed:', sttRes.status, errText);
      return res.status(sttRes.status).json({ error: 'STT conversion failed', details: errText });
    }
  } catch (err: any) {
    console.error('Sarvam STT exception:', err);
    return res.status(500).json({ error: 'STT service error', message: err.message });
  }

  const sttMs = Math.round(performance.now() - sttStart);

  // If transcript is empty (silence/noise)
  if (!translatedText.trim()) {
    translatedText = '[Unclear audio or ambient background noise]';
  }

  // Language identification if not detected or update confidence
  if (!session.callerLanguage || session.callerLanguage.code !== detectedLang) {
    session.callerLanguage = {
      code: detectedLang,
      name: getLanguageName(detectedLang),
      confidence: Math.round(confidence * 100),
    };
  }

  // Operator translation if Hindi
  let finalOperatorTranscript = translatedText;
  let transMs = 0;
  if (session.operatorLanguage === 'hi-IN' && detectedLang !== 'hi-IN' && translatedText) {
    const transStart = performance.now();
    try {
      const transRes = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': SARVAM_API_KEY,
        },
        body: JSON.stringify({
          input: translatedText,
          source_language_code: 'en-IN',
          target_language_code: 'hi-IN',
        }),
      });
      if (transRes.ok) {
        const transData = await transRes.json();
        finalOperatorTranscript = transData.translated_text || translatedText;
      }
    } catch (e) {
      console.error('Hindi translation error:', e);
    }
    transMs = Math.round(performance.now() - transStart);
  }

  const transcriptItem: TranscriptItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender: 'caller',
    timestamp: Date.now(),
    originalText: translatedText, // STT translate gives english representation
    originalLanguage: detectedLang,
    originalLanguageName: getLanguageName(detectedLang),
    translatedText: finalOperatorTranscript,
    translatedLanguage: session.operatorLanguage,
    translatedLanguageName: getLanguageName(session.operatorLanguage),
    audioBase64: audioBuffer.toString('base64'),
    latencies: {
      sttMs,
      transMs,
      totalMs: sttMs + transMs,
    },
  };

  session.transcripts.push(transcriptItem);
  session.latencies = {
    lastSttMs: sttMs,
    lastTransMs: transMs,
    totalRoundtripMs: sttMs + transMs,
  };

  broadcastSessionUpdate(sessionId, session);
  res.json({ session, transcriptItem });
});

// 8. Operator replies to caller
app.post('/api/session/:id/operator-reply', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = getOrCreateSession(sessionId);
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text reply is required' });
  }

  // Caller's target language (default to Tamil or Hindi if none detected yet)
  const callerLangCode = session.callerLanguage?.code || 'ta-IN';
  const operatorLangCode = session.operatorLanguage || 'en-IN';

  let translatedReply = text;
  let transMs = 0;

  // 1. Text Translation (Operator -> Caller's Language)
  if (callerLangCode !== operatorLangCode) {
    const transStart = performance.now();
    try {
      const transPayload: any = {
        input: text,
        source_language_code: operatorLangCode,
        target_language_code: callerLangCode,
      };

      // If Assamese, use sarvam-translate:v1 as verified in benchmark
      if (callerLangCode === 'as-IN') {
        transPayload.model = 'sarvam-translate:v1';
      }

      const transRes = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': SARVAM_API_KEY,
        },
        body: JSON.stringify(transPayload),
      });

      if (transRes.ok) {
        const transData = await transRes.json();
        translatedReply = transData.translated_text || text;
      } else {
        console.warn('Operator translation error:', transRes.status, await transRes.text());
      }
    } catch (e: any) {
      console.error('Translation error:', e.message);
    }
    transMs = Math.round(performance.now() - transStart);
  }

  // 2. Text-to-Speech (in Caller's regional language)
  let audioBase64: string | undefined;
  let ttsMs = 0;
  const ttsStart = performance.now();

  try {
    // For Assamese, Sarvam TTS requires beta access so we use bn-IN (Bengali Eastern Indo-Aryan phonetic match)
    const ttsLangCode = callerLangCode === 'as-IN' ? 'bn-IN' : callerLangCode;

    // Pick speaker based on language
    const speakerMap: Record<string, string> = {
      'ta-IN': 'vijay',
      'hi-IN': 'aditya',
      'bn-IN': 'shubh',
      'te-IN': 'kavitha',
      'kn-IN': 'chetan_kn_conversation',
      'mr-IN': 'soham_mr_narration',
      'gu-IN': 'pooja_gu_conversational',
      'en-IN': 'shubh',
    };
    const speaker = speakerMap[ttsLangCode] || 'shubh';

    const ttsRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [translatedReply],
        target_language_code: ttsLangCode,
        speaker: speaker,
        model: 'bulbul:v3',
      }),
    });

    if (ttsRes.ok) {
      const ttsData = await ttsRes.json();
      if (ttsData.audios && ttsData.audios[0]) {
        audioBase64 = ttsData.audios[0];
      }
    } else {
      console.warn('TTS call status:', ttsRes.status, await ttsRes.text());
    }
  } catch (e: any) {
    console.error('TTS error:', e.message);
  }

  ttsMs = Math.round(performance.now() - ttsStart);
  const totalMs = transMs + ttsMs;

  const transcriptItem: TranscriptItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender: 'operator',
    timestamp: Date.now(),
    originalText: text,
    originalLanguage: operatorLangCode,
    originalLanguageName: getLanguageName(operatorLangCode),
    translatedText: translatedReply,
    translatedLanguage: callerLangCode,
    translatedLanguageName: getLanguageName(callerLangCode),
    audioBase64: audioBase64,
    latencies: {
      transMs,
      ttsMs,
      totalMs,
    },
  };

  session.transcripts.push(transcriptItem);
  session.latencies = {
    ...session.latencies,
    lastTransMs: transMs,
    lastTtsMs: ttsMs,
    totalRoundtripMs: totalMs,
  };

  broadcastSessionUpdate(sessionId, session);
  broadcastAudioEvent(sessionId, transcriptItem);

  res.json({ session, transcriptItem });
});

// Vite middleware in dev or static files in production
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  server.listen(PORT, () => {
    console.log(`First-Responder Babel server running on http://localhost:${PORT}`);
  });
});
