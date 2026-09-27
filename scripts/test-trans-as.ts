import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SARVAM_API_KEY!;

async function testTranslate() {
  const res = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': API_KEY,
    },
    body: JSON.stringify({
      input: 'ৰাষ্ট্ৰীয় ঘাইপথত এখন ডাঙৰ গাড়ী আৰু বাছৰ মুখামুখি সংঘৰ্ষ হৈছে! বহুতো মানুহ আহত হৈছে, তেজ ওলাইছে, সোনকালে পুলিচ আৰু এম্বুলেন্স পঠিয়াওক!',
      source_language_code: 'as-IN',
      target_language_code: 'en-IN',
    }),
  });
  console.log('Translate as-IN to en-IN:', res.status, await res.text());
}

testTranslate();
