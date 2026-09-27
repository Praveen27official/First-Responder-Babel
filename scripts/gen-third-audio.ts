import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_KEY = process.env.SARVAM_API_KEY!;
const filePath = path.resolve('public/demo_audio/assamese-accident.wav');

async function gen() {
  const text = 'ৰাষ্ট্ৰীয় ঘাইপথত এখন ডাঙৰ গাড়ী আৰু বাছৰ মুখামুখি সংঘৰ্ষ হৈছে! বহুতো মানুহ আহত হৈছে, তেজ ওলাইছে, সোনকালে পুলিচ আৰু এম্বুলেন্স পঠিয়াওক!';
  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': API_KEY,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'bn-IN',
      speaker: 'shubh',
      model: 'bulbul:v3',
    }),
  });

  const data = await res.json();
  if (data.audios && data.audios[0]) {
    const buffer = Buffer.from(data.audios[0], 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log('✓ Successfully generated assamese-accident.wav:', buffer.length, 'bytes');
  } else {
    console.error('Failed to generate:', data);
  }
}

gen();
