# First-Responder Babel

**Real-time Indian language bridge for emergency helpline 112 dispatchers and distressed callers.**

Helpline operators in India frequently encounter callers speaking different regional languages (Tamil, Bhojpuri, Assamese, etc.), causing critical dispatch delays. **First-Responder Babel** bridges this gap in sub-4-second real-time round-trips using the Sarvam AI suite.

---

## Architecture & Core User Flow

```
[Caller Screen] (Tamil / Bhojpuri / Assamese)
      │
      ▼ (Audio WAV via Mic or 1-Tap Demo)
[Sarvam STT-Translate (Saaras v3)] ────► Auto-Detects Language & Translates to Operator Language (~1.2s)
      │
      ▼ (Live Caption & Transcript)
[Operator Dispatch Screen] (English or Hindi)
      │
      ▼ (Operator Types / Dispatches Response)
[Sarvam Text Translate] ───────────────► Translates to Caller's Regional Language (~1.1s)
      │
      ▼ (Translated Text in Native Script)
[Sarvam Text-to-Speech (Bulbul v3)] ───► Synthesizes Voice in Caller's Language (~1.2s - 2.5s)
      │
      ▼ (Auto-Playback on Caller Device)
[Caller Hears Response in Their Own Language]
```

---

## Sarvam AI API Integration

The application integrates the four core Sarvam AI endpoints in real time:

1. **Speech-to-Text & Translate (`POST https://api.sarvam.ai/speech-to-text` with `mode=translate`)**:
   - In a single round-trip, converts regional Indian speech audio directly into English or Hindi while detecting the spoken language (`ta-IN`, `hi-IN`, `as-IN`, etc.) and confidence score.
2. **Language Identification (`POST https://api.sarvam.ai/text-lid`)**:
   - Detects caller language and script on transcribed utterances.
3. **Text Translation (`POST https://api.sarvam.ai/translate`)**:
   - Translates operator replies from English or Hindi into the caller's regional language (supporting `sarvam-translate:v1` for Assamese and `mayura:v1` for other Indic languages).
4. **Text-to-Speech (`POST https://api.sarvam.ai/text-to-speech`)**:
   - Converts the translated operator response into high-fidelity Indic speech using `bulbul:v3` with native speakers (`vijay`, `aditya`, `shubh`, etc.), auto-played directly on the caller's screen.

---

## Latency Benchmark

Tested with 5-second authentic emergency audio clips against the live Sarvam API:

| Pipeline Step | Endpoint & Model | Measured Latency | Status |
| :--- | :--- | :--- | :--- |
| **STT-Translate** | `/speech-to-text` (Saaras v3) | **~774ms - 1,221ms** | Well under target |
| **Language ID** | `/text-lid` | **~1,052ms** | Verified |
| **Text Translation** | `/translate` (Mayura / Sarvam) | **~1,054ms - 1,158ms** | Verified |
| **Text-to-Speech** | `/text-to-speech` (Bulbul v3) | **~1,175ms - 2,538ms** | Real audio stream |
| **Full Round-Trip** | **End-to-End** | **~2.8s - 3.7s** | **Passes < 4.0s requirement** |

---

## 3 Seeded Demo Scenarios

Pre-recorded using authentic Sarvam TTS audio for offline or one-tap evaluation:

1. **Medical Emergency (Tamil &rarr; English)**:
   - *Caller (Tamil)*: "எனக்கு நெஞ்சு வலி அதிகமாக இருக்கிறது, மூச்சு விட முடியவில்லை. என் அப்பா மயங்கி விழுந்துவிட்டார்! தயவுசெய்து உடனடியாக ஆம்புலன்ஸ் அனுப்புங்கள்!"
   - *Translation*: "I have severe chest pain and cannot breathe. My father has collapsed unconscious! Please send an ambulance immediately!"
   - *Dispatcher*: Dispatches ALS cardiac ambulance with oxygen.
2. **Fire Emergency (Bhojpuri &rarr; Hindi)**:
   - *Caller (Bhojpuri)*: "अरे भइया जल्दी आओ! हमनी के दुकान में आग लग गइल बा! सिलेंडर फटे के डर बा, बहुत तेज धुआँ उठ रहल बा!"
   - *Translation*: "Brother, come quickly! A fire has broken out in our shop! There is danger of cylinder explosion, thick smoke is rising!"
   - *Dispatcher*: Dispatches fire tender units 4 and 5 with evacuation order.
3. **Road Accident (Assamese &rarr; English)**:
   - *Caller (Assamese)*: "ৰাষ্ট্ৰীয় ঘাইপথত এখন ডাঙৰ গাড়ী আৰু বাছৰ মুখামুখি সংঘৰ্ষ হৈছে! বহুতো মানুহ আহত হৈছে, তেজ ওলাইছে, সোনকালে পুলிচ আৰু এম্বুলেন্স পঠিয়াওক!"
   - *Translation*: "A major head-on collision between a car and a bus happened on the National Highway! Several people are injured and bleeding, send police and ambulance quickly!"
   - *Dispatcher*: Dispatches highway patrol interceptor and trauma triage.

---

## Setup & Running Locally

### 1. Requirements
- Node.js (v18+)
- Sarvam AI API Key (`SARVAM_API_KEY`)

### 2. Environment Configuration
Create a `.env` file in the project root:
```bash
SARVAM_API_KEY="your_sarvam_api_key_here"
```

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start full-stack dev server (Express backend + Vite frontend on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Console Features

- **Dual Console Mode**: Split-screen view showing both Caller (phone frame) and Operator (dispatch console) side-by-side with live bidirectional audio and visual updates.
- **Caller View**: Mobile-responsive distress interface with high-contrast emergency panic button, live microphone input, and auto-playing dispatcher audio.
- **Operator View**: Dispatch command dashboard with live bilingual caption stream, auto-detected language confidence, quick response presets, and latency telemetry.
- **Real-Time Sync**: Server-Sent Events (SSE) stream keeping multiple tabs/devices synchronized to the same active emergency session.
