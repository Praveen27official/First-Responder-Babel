import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_KEY = process.env.SARVAM_API_KEY!;

async function testSttWav() {
  const filePath = path.resolve('public/demo_audio/tamil-medical.wav');
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: 'audio/wav' });

  const formData = new FormData();
  formData.append('file', blob, 'tamil-medical.wav');
  formData.append('model', 'saaras:v3');
  formData.append('mode', 'translate');

  console.log('Sending tamil-medical.wav to Sarvam /speech-to-text (mode=translate)...');
  const t0 = performance.now();
  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'api-subscription-key': API_KEY,
    },
    body: formData,
  });

  const duration = (performance.now() - t0).toFixed(0);
  console.log(`STT Response in ${duration}ms, Status: ${res.status}`);
  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));
}

testSttWav();
