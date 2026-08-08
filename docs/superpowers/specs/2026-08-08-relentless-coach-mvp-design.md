# Relentless Coach — MVP V1 Design

**Status:** Approved for planning
**Source PRD:** `.ai/PRD.md`
**Date:** 2026-08-08

## 1. Summary

Relentless Coach is a web app that turns a user's excuse or situation into a short,
intense motivational voice-over performed by an original "relentless coach" persona.
This document scopes and designs the **MVP V1**: the full generation loop
(situation → script → voice → audio) as a working, deployable app — no accounts,
no persistence, no history.

## 2. Scope

**In scope (this build):**
- Next.js web app (single screen)
- Situation text input + 6 presets
- Intensity selector (1–10)
- LLM script + voice-direction generation (OpenAI)
- TTS audio generation (ElevenLabs)
- Audio playback, regenerate, download
- Basic safety guardrails + per-IP rate limiting

**Explicitly out of scope (deferred to later phases per PRD roadmap):**
- User accounts / auth
- Database / persistence / history endpoint
- Object storage for generated audio
- Personalization / user profiles
- Content moderation API call (relying on system-prompt-level safety instead)
- Daily reminders, conversational/voice-chat coach, adaptive learning (V2+)

## 3. Architecture

Single Next.js app (App Router). No database. No auth.

```text
Browser
  │
  ├─ POST /api/script  { situation, intensity, duration }
  │     → OpenAI (Relentless Coach system prompt)
  │     ← { script, voice_direction }
  │
  └─ POST /api/voice   { script, intensity }
        → map intensity → ElevenLabs voice settings
        → ElevenLabs TTS (fixed stock voice_id)
        ← audio bytes (streamed, not stored)
```

Two separate routes (not one combined `/api/generate`) so the UI can reveal the
script text as soon as it's ready, then generate audio in the background —
keeping the experience responsive toward the PRD's <15s target even though the
two calls are sequential end-to-end.

Both routes share a simple in-memory per-IP rate limiter to bound cost exposure
on this open, unauthenticated surface.

## 4. LLM Script Generation (`/api/script`)

**Input:** `{ situation: string (≤500 chars), intensity: 1-10, duration: number (seconds) }`

**System prompt** encodes the Relentless Coach character (PRD Phase 3):
extremely disciplined, direct, intense, confrontational, accountable, resilient,
unapologetic, action-oriented. Short sentences, strong statements, deliberate
pauses, repetition, direct commands, minimal fluff. Explicitly instructed to:
- Never claim to be or impersonate David Goggins, or imply his endorsement.
- Scale word choice, sentence structure, and aggressiveness to the given intensity.
- Refuse/redirect if the input leans toward self-harm, suicide, dangerous
  physical behavior, eating disorders, drug use, violence, or abuse — respond
  instead with a safe but still direct, in-character redirection (never a
  generic canned refusal, never silent failure).

**Output:** `{ script: string, voice_direction: { pace, tone, emotion, pauses, ending } }`

`voice_direction` is returned for transparency/future use but the MVP does not
feed free-form fields into ElevenLabs directly — see §5.

## 5. Voice Generation (`/api/voice`)

**Input:** `{ script: string, intensity: 1-10 }`

Deterministic mapping from `intensity` to ElevenLabs voice settings:
- Higher intensity → lower `stability`, higher `style` (more exaggerated,
  less even delivery).
- `similarity_boost` held constant.

Uses a single fixed stock ElevenLabs voice (`ELEVENLABS_VOICE_ID` in env)
chosen to match the "deep, rough, masculine, commanding, intense, controlled,
natural" character description. Not a clone of a real person's voice.

**Output:** audio stream (bytes), returned directly to the client — never
written to disk or object storage.

## 6. UI Flow

Single-page, dark/minimal/intense styling (visual detail deferred to
implementation-time frontend design pass):

1. **Input** — textarea (500 char limit), placeholder "What's stopping you?"
2. **Presets** — 6 buttons (Study, Workout, Work, Morning, Interview,
   Discipline) that pre-fill the textarea with the PRD's example phrases.
3. **Intensity slider** — 1–10, labeled at anchor points (Calm/Firm/Tough/
   Relentless/Extreme).
4. **Generate** — disabled while any request is in flight. Triggers
   `/api/script`.
5. **Script reveal** — script text appears as soon as `/api/script` resolves;
   UI immediately shows a "generating voice…" state and calls `/api/voice`.
6. **Audio player** — appears once `/api/voice` resolves. Play/pause, seek,
   duration, **Regenerate** (re-runs both calls with the same input),
   **Download** (client-side blob download, no server storage).

**Error handling:** any failure in either route (rate limit, upstream API
error, in-character safety redirection) surfaces as an inline error with a
retry action — no silent failures, no partial/broken audio states.

## 7. Config & Secrets

- `.env.local` holds `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`,
  `ELEVENLABS_VOICE_ID`.
- `.gitignore` added before first commit, covering `.env*`, `node_modules`,
  `.next`.
- The pre-existing untracked `.env` (containing a live ElevenLabs key) will be
  migrated into `.env.local`; it was never committed to git.
- An `OPENAI_API_KEY` must be supplied by the user before end-to-end testing
  is possible — not something that can be generated automatically.

## 8. Testing Approach

- Unit-level: intensity → ElevenLabs settings mapping function (pure,
  deterministic — easy to test exhaustively across 1–10).
- Route-level: `/api/script` and `/api/voice` tested against mocked
  OpenAI/ElevenLabs clients for success, upstream-failure, and rate-limited
  paths.
- Manual: full browser walkthrough of the golden path (enter situation →
  generate → hear audio → regenerate → download) plus the safety-redirect
  path with a deliberately harmful input.

## 9. Explicitly Deferred (V2+, per PRD roadmap)

Persistence/history, user accounts, personalization/profiles, daily
reminders, real-time conversational coach, adaptive strategy learning. These
map to PRD Phases 8 and the V2–V5 roadmap and are not part of this design.
