import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_KEY = process.env.SARVAM_API_KEY;

if (!API_KEY) {
  console.error('Missing SARVAM_API_KEY');
  process.exit(1);
}

const audioDir = path.resolve('public/demo_audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

interface DemoScenario {
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

const scenarios: DemoScenario[] = [
  {
    id: 'tamil-medical',
    name: 'Medical Emergency — Tamil to English',
    emergencyType: 'medical',
    callerLanguage: 'Tamil',
    callerLanguageCode: 'ta-IN',
    speaker: 'vijay',
    operatorLanguage: 'English',
    operatorLanguageCode: 'en-IN',
    callerUtterance: 'எனக்கு நெஞ்சு வலி அதிகமாக இருக்கிறது, மூச்சு விட முடியவில்லை. என் அப்பா மயங்கி விழுந்துவிட்டார்! தயவுசெய்து உடனடியாக ஆம்புலன்ஸ் அனுப்புங்கள்!',
    operatorReply: 'An emergency cardiac ambulance has been dispatched to your GPS location. Keep him lying flat on his back, loosen tight clothing, and do not give any water. Paramedics will arrive in 6 minutes.',
  },
  {
    id: 'bhojpuri-fire',
    name: 'Fire Hazard — Bhojpuri to Hindi',
    emergencyType: 'fire',
    callerLanguage: 'Bhojpuri / Hindi',
    callerLanguageCode: 'hi-IN',
    speaker: 'aditya',
    operatorLanguage: 'Hindi',
    operatorLanguageCode: 'hi-IN',
    callerUtterance: 'अरे भइया जल्दी आओ! हमनी के दुकान में आग लग गइल बा! सिलेंडर फटे के डर बा, बहुत तेज धुआँ उठ रहल बा!',
    operatorReply: 'फायर ब्रिगेड की दो गाड़ियाँ तुरंत रवाना कर दी गई हैं। आप सब तुरंत दुकान से बाहर खुली जगह में आ जाएँ और सिलेंडर से दूर रहें।',
  },
  {
    id: 'assamese-accident',
    name: 'Highway Crash — Assamese to English',
    emergencyType: 'accident',
    callerLanguage: 'Assamese',
    callerLanguageCode: 'as-IN',
    speaker: 'mouchumi_as_conversational',
    operatorLanguage: 'English',
    operatorLanguageCode: 'en-IN',
    callerUtterance: 'ৰাষ্ট্ৰীয় ঘাইপথত এখন ডাঙৰ গাড়ী আৰু বাছৰ মুখামুখি সংঘৰ্ষ হৈছে! বহুতো মানুহ আহত হৈছে, তেজ ওলাইছে, সোনকালে পুলিচ আৰু এম্বুলেন্স পঠিয়াওক!',
    operatorReply: 'Two rescue teams and 3 ambulances are en route via Highway Patrol. Ensure bystanders don\'t crowd the victims, apply clean cloth pressure to heavy bleeding if safe.',
  },
];

async function generateDemos() {
  console.log('Generating demo audio files for 3 emergency scenarios using Sarvam Bulbul TTS...');

  for (const s of scenarios) {
    const filePath = path.join(audioDir, `${s.id}.wav`);
    console.log(`\nGenerating audio for [${s.name}]...`);

    try {
      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': API_KEY!,
        },
        body: JSON.stringify({
          inputs: [s.callerUtterance],
          target_language_code: s.callerLanguageCode,
          speaker: s.speaker,
          model: 'bulbul:v3',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to generate ${s.id}: ${res.status} - ${errText}`);
        // Fallback to default speaker 'shubh' if specific speaker not valid
        console.log(`Trying fallback speaker 'shubh'...`);
        const fallbackRes = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': API_KEY!,
          },
          body: JSON.stringify({
            inputs: [s.callerUtterance],
            target_language_code: s.callerLanguageCode,
            speaker: 'shubh',
            model: 'bulbul:v3',
          }),
        });
        const fbData = await fallbackRes.json();
        if (fbData.audios && fbData.audios[0]) {
          const buffer = Buffer.from(fbData.audios[0], 'base64');
          fs.writeFileSync(filePath, buffer);
          console.log(`✓ Saved fallback audio to ${filePath} (${buffer.length} bytes)`);
        }
      } else {
        const data = await res.json();
        if (data.audios && data.audios[0]) {
          const buffer = Buffer.from(data.audios[0], 'base64');
          fs.writeFileSync(filePath, buffer);
          console.log(`✓ Saved audio to ${filePath} (${buffer.length} bytes)`);
        }
      }
    } catch (err: any) {
      console.error(`Error generating ${s.id}:`, err.message);
    }
  }

  // Also write the scenarios JSON file to src/data/scenarios.json
  const dataDir = path.resolve('src/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'scenarios.json'), JSON.stringify(scenarios, null, 2));
  console.log('\n✓ Saved scenarios metadata to src/data/scenarios.json');
}

generateDemos();
