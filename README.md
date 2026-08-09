# Relentless Coach MVP

An AI motivational voice-over generator: describe what's stopping you and get back a short,
intense, spoken pep talk from an original "relentless coach" persona.

## Environment variables

Create a `.env.local` with:

- `OPENAI_API_KEY` — OpenAI key used to generate the coaching script.
- `ELEVENLABS_API_KEY` — ElevenLabs key used to generate the voice-over audio.
- `ELEVENLABS_VOICE_ID` — ID of the fixed ElevenLabs voice used for playback.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing & building

```bash
npm test
npm run build
```
