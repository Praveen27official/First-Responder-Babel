import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SARVAM_API_KEY!;

async function test() {
  const text = 'ৰাষ্ট্ৰীয় ঘাইপথত এখন ডাঙৰ গাড়ী আৰু বাছৰ মুখামুখি সংঘৰ্ষ হৈছে! বহুতো মানুহ আহত হৈছে, তেজ ওলাইছে, সোনকালে পুলিচ আৰু এম্বুলেন্স পঠিয়াওক!';
  
  // Try bulbul:v3 with speaker shubh
  const res3 = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': API_KEY,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'as-IN',
      speaker: 'shubh',
      model: 'bulbul:v3',
    }),
  });
  console.log('v3 as-IN response:', res3.status, await res3.text());

  // Try bulbul:v2 with speaker mouchumi_as_conversational
  const res2 = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': API_KEY,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'as-IN',
      speaker: 'mouchumi_as_conversational',
      model: 'bulbul:v2',
    }),
  });
  console.log('v2 mouchumi response:', res2.status, await res2.text());
}

test();
