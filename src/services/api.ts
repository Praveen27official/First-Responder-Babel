import { CallSession, TranscriptItem, DemoScenario } from '../types.ts';

const SESSION_ID = 'call-112-alpha';

export async function fetchSession(sessionId = SESSION_ID): Promise<CallSession> {
  const res = await fetch(`/api/session/${sessionId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch session: ${res.statusText}`);
  }
  return res.json();
}

export async function resetSession(sessionId = SESSION_ID, operatorLanguage = 'en-IN'): Promise<CallSession> {
  const res = await fetch(`/api/session/${sessionId}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operatorLanguage }),
  });
  if (!res.ok) {
    throw new Error(`Failed to reset session: ${res.statusText}`);
  }
  return res.json();
}

export async function updateSession(sessionId = SESSION_ID, updates: Partial<CallSession>): Promise<CallSession> {
  const res = await fetch(`/api/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error(`Failed to update session: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchScenarios(): Promise<DemoScenario[]> {
  const res = await fetch('/api/scenarios');
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function triggerScenario(
  scenarioId: string,
  sessionId = SESSION_ID
): Promise<{ session: CallSession; transcriptItem: TranscriptItem }> {
  const res = await fetch(`/api/session/${sessionId}/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Scenario trigger failed: ${res.statusText}`);
  }
  return res.json();
}

export async function sendCallerAudio(
  audioBlob: Blob,
  sessionId = SESSION_ID
): Promise<{ session: CallSession; transcriptItem: TranscriptItem }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'caller.wav');

  const res = await fetch(`/api/session/${sessionId}/caller-audio`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || `Audio processing failed: ${res.statusText}`);
  }
  return res.json();
}

export async function sendOperatorReply(
  text: string,
  sessionId = SESSION_ID
): Promise<{ session: CallSession; transcriptItem: TranscriptItem }> {
  const res = await fetch(`/api/session/${sessionId}/operator-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Reply sending failed: ${res.statusText}`);
  }
  return res.json();
}

export function subscribeToSession(
  sessionId = SESSION_ID,
  onUpdate: (session: CallSession) => void,
  onAudio?: (item: TranscriptItem) => void
): () => void {
  const eventSource = new EventSource(`/api/session/${sessionId}/stream`);

  eventSource.addEventListener('session_update', (e) => {
    try {
      const data: CallSession = JSON.parse(e.data);
      onUpdate(data);
    } catch (err) {
      console.error('Failed to parse SSE session_update:', err);
    }
  });

  eventSource.addEventListener('new_audio', (e) => {
    try {
      const data: TranscriptItem = JSON.parse(e.data);
      onAudio?.(data);
    } catch (err) {
      console.error('Failed to parse SSE new_audio:', err);
    }
  });

  eventSource.onerror = (err) => {
    console.warn('SSE connection warning:', err);
  };

  return () => {
    eventSource.close();
  };
}

// Audio playback helper for base64 or URL audio
export function playAudio(audioBase64OrUrl: string): HTMLAudioElement {
  const src = audioBase64OrUrl.startsWith('data:') || audioBase64OrUrl.startsWith('/') || audioBase64OrUrl.startsWith('http')
    ? audioBase64OrUrl
    : `data:audio/wav;base64,${audioBase64OrUrl}`;

  const audio = new Audio(src);
  audio.play().catch((e) => {
    console.warn('Audio auto-play prevented by browser policy (user gesture required):', e);
  });
  return audio;
}
