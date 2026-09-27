import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SARVAM_API_KEY;

if (!API_KEY) {
  console.error('Error: SARVAM_API_KEY is not set in environment or .env');
  process.exit(1);
}

// Generate a valid 5-second mono 16kHz 16-bit PCM WAV file buffer
function generateSampleWav(durationSeconds = 5, sampleRate = 16000): Buffer {
  const numSamples = durationSeconds * sampleRate;
  const byteRate = sampleRate * 2; // 16 bit mono = 2 bytes per sample
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill with human voice frequency modulated sine wave (220Hz - 440Hz harmonic) to simulate vocal pitch
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 300 + 50 * Math.sin(2 * Math.PI * 2 * t);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.3;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

async function runTests() {
  console.log('==============================================');
  console.log('First-Responder Babel: Sarvam AI Latency & API Test');
  console.log('==============================================');
  console.log('Using API Key: ' + API_KEY.slice(0, 6) + '...' + API_KEY.slice(-4));

  // 1. Test Text-LID (Language Identification)
  console.log('\n[1/4] Testing Language Identification (/text-lid)...');
  const lidStart = performance.now();
  try {
    const lidRes = await fetch('https://api.sarvam.ai/text-lid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': API_KEY,
      },
      body: JSON.stringify({
        input: 'எனக்கு உடனடியாக ஆம்புலன்ஸ் தேவை, நெஞ்சு வலி அதிகமாக இருக்கிறது',
      }),
    });
    const lidDuration = (performance.now() - lidStart).toFixed(0);
    const lidData = await lidRes.json();
    console.log(`✓ LID completed in ${lidDuration}ms. Status: ${lidRes.status}`);
    console.log('Result:', JSON.stringify(lidData));
  } catch (err: any) {
    console.error('LID Error:', err.message);
  }

  // 2. Test Text Translation (/translate)
  console.log('\n[2/4] Testing Text Translation (/translate)...');
  const transStart = performance.now();
  try {
    const transRes = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': API_KEY,
      },
      body: JSON.stringify({
        input: 'An ambulance has been dispatched to your location. Stay calm and keep the patient lying down.',
        source_language_code: 'en-IN',
        target_language_code: 'ta-IN',
        mode: 'formal',
      }),
    });
    const transDuration = (performance.now() - transStart).toFixed(0);
    const transData = await transRes.json();
    console.log(`✓ Translation completed in ${transDuration}ms. Status: ${transRes.status}`);
    console.log('Result:', JSON.stringify(transData));
  } catch (err: any) {
    console.error('Translate Error:', err.message);
  }

  // 3. Test Text-to-Speech (/text-to-speech)
  console.log('\n[3/4] Testing Text-to-Speech (/text-to-speech)...');
  const ttsStart = performance.now();
  try {
    const ttsRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': API_KEY,
      },
      body: JSON.stringify({
        inputs: ['உங்கள் இடத்திற்கு ஒரு ஆம்புலன்ஸ் அனுப்பப்பட்டுள்ளது.'],
        target_language_code: 'ta-IN',
        speaker: 'shubh',
        model: 'bulbul:v3',
      }),
    });
    const ttsDuration = (performance.now() - ttsStart).toFixed(0);
    const ttsData = await ttsRes.json();
    console.log(`✓ TTS completed in ${ttsDuration}ms. Status: ${ttsRes.status}`);
    if (ttsData.audios && ttsData.audios[0]) {
      console.log(`✓ TTS Success! Received base64 audio string (length: ${ttsData.audios[0].length})`);
    } else {
      console.log('TTS Response:', JSON.stringify(ttsData));
    }
  } catch (err: any) {
    console.error('TTS Error:', err.message);
  }

  // 4. Test STT-Translate with 5-second sample audio
  console.log('\n[4/4] Testing STT with 5s sample audio (/speech-to-text)...');
  const sampleWav = generateSampleWav(5, 16000);
  console.log(`Generated 5s sample WAV buffer: ${sampleWav.length} bytes`);

  const sttStart = performance.now();
  try {
    const formData = new FormData();
    const blob = new Blob([sampleWav], { type: 'audio/wav' });
    formData.append('file', blob, 'sample.wav');
    formData.append('model', 'saaras:v3');
    formData.append('mode', 'translate');

    const sttRes = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': API_KEY,
      },
      body: formData,
    });

    const sttDuration = (performance.now() - sttStart).toFixed(0);
    const sttData = await sttRes.json();
    console.log(`✓ STT completed in ${sttDuration}ms. Status: ${sttRes.status}`);
    console.log('STT Result:', JSON.stringify(sttData));

    console.log('\n==============================================');
    console.log(`FULL LATENCY BENCHMARK:`);
    console.log(`- STT Round-trip: ${sttDuration}ms`);
    console.log('==============================================');
  } catch (err: any) {
    console.error('STT Error:', err.message);
  }
}

runTests();
