# Relentless Coach MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Relentless Coach MVP V1 — a Next.js web app where a user
describes what's stopping them, picks an intensity, and gets back an
AI-written, AI-voiced motivational audio clip.

**Architecture:** Single Next.js (App Router, TypeScript) app, no database, no
auth. Two API routes: `POST /api/script` (OpenAI generates the coach's script
+ voice direction) and `POST /api/voice` (ElevenLabs TTS renders that script
to audio, using a deterministic intensity→voice-settings mapping). Both share
an in-memory per-IP rate limiter. Audio is streamed straight through, never
persisted.

**Tech Stack:** Next.js 16.3.0 (App Router, TypeScript), React, `openai`
7.4.0, `@elevenlabs/elevenlabs-js` 2.62.0, Vitest 4.1.10 +
`@testing-library/react` 16.3.2 for tests, `next dev` for manual browser
verification.

## Global Constraints

- No database, no object storage, no user accounts/auth (spec §2, §3).
- Generated audio is never written to disk or persisted server-side — streamed
  directly to the client (spec §5).
- The coach must never claim to be or impersonate David Goggins, or imply his
  endorsement (spec §4, PRD Phase 3/10).
- The coach must refuse/redirect self-harm, suicide, dangerous physical
  behavior, eating disorder, drug use, violence, or abuse content with an
  in-character redirection — never a generic canned refusal, never silent
  failure (spec §4).
- `/api/script` and `/api/voice` are both rate-limited per-IP (spec §3).
- Situation input is capped at 500 characters (spec §4, §6).
- Secrets (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`) live
  in `.env.local`, never committed (spec §7).
- No silent failures anywhere in the request flow — every error state is
  visible to the user with a retry path (spec §6).

---

## Task 1: Scaffold Next.js app and secrets migration

**Files:**
- Create: entire Next.js project scaffold (`package.json`, `tsconfig.json`,
  `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`,
  `src/app/globals.css`, etc.) via `create-next-app`
- Create: `.env.local` (gitignored, not committed)
- Modify: `.gitignore` (already exists at repo root — verify it still covers
  `.env*`, `node_modules`, `.next`)
- Delete: `.env` (contents migrated into `.env.local`)

**Interfaces:**
- Produces: a running `next dev` server on `http://localhost:3000` serving
  the default Next.js starter page. `.env.local` with keys
  `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` available to
  later tasks via `process.env`.

- [ ] **Step 1: Scaffold the app**

Run from the repo root:

```bash
npx create-next-app@16.3.0 . --typescript --app --eslint --src-dir --import-alias "@/*" --use-npm --no-tailwind
```

When prompted about the current directory not being empty, confirm yes (the
repo currently only has `.ai/`, `.env`, `.gitignore`, `docs/`).

- [ ] **Step 2: Verify the scaffold**

Run: `npm run dev`
Expected: server starts on port 3000 without errors. Stop it with Ctrl+C once
confirmed (or check the terminal output shows "Ready" and then kill the
process).

- [ ] **Step 3: Migrate secrets**

Read the existing `.env` file, then create `.env.local` with:

```env
OPENAI_API_KEY=
ELEVENLABS_API_KEY=sk_c42232045f94d04e4f47c2dd1a8cd965f0b7bdaad5b3bf15
ELEVENLABS_VOICE_ID=
```

Leave `OPENAI_API_KEY` and `ELEVENLABS_VOICE_ID` blank — the user must supply
the OpenAI key, and Task 4 will determine and fill in a specific stock
ElevenLabs voice ID. Then delete the old `.env` file (`rm .env`).

- [ ] **Step 4: Confirm .gitignore covers secrets**

Read `.gitignore` and confirm it contains `.env`, `.env.local`, and
`.env*.local` patterns (it was created during brainstorming with exactly
this content:)

```gitignore
.env
.env.local
.env*.local
node_modules/
.next/
```

`create-next-app` will also generate its own `.gitignore` with
`node_modules`, `.next`, `.env*.local` etc. — merge if `create-next-app`
overwrote the repo-root one, keeping the plain `.env` entry (create-next-app's
template only ignores `.env*.local`, not bare `.env`).

- [ ] **Step 5: Verify secrets are not tracked**

Run: `git status --short`
Expected: `.env.local` and `.env` do NOT appear in the output (either
untracked-but-ignored, or gone). `node_modules/` and `.next/` also do not
appear.

- [ ] **Step 6: Commit the scaffold**

```bash
git add -A
git status --short
```

Review the output carefully — confirm no `.env` or `.env.local` file is
staged — then:

```bash
git commit -m "$(cat <<'EOF'
Scaffold Next.js app for Relentless Coach MVP

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Install and configure Vitest

**Files:**
- Modify: `package.json` (add devDependencies + `test` script)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/lib/sanity.test.ts` (throwaway — deleted at end of task)

**Interfaces:**
- Produces: `npm test` runs Vitest once; `npm run test:watch` runs it in
  watch mode. Later tasks' `*.test.ts` files under `src/` are auto-discovered.

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev vitest@4.1.10 @testing-library/react@16.3.2 @testing-library/jest-dom@6.6.3 jsdom@25.0.1 @vitejs/plugin-react@4.3.4
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create setup file**

Create `vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test scripts to package.json**

Edit `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a throwaway sanity test**

Create `src/lib/sanity.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it to verify the harness works**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 7: Delete the sanity test**

Run: `rm src/lib/sanity.test.ts` — it was only to prove the harness works;
real tests start in Task 3.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "$(cat <<'EOF'
Add Vitest testing harness

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Intensity → voice settings mapping

**Files:**
- Create: `src/lib/voiceSettings.ts`
- Test: `src/lib/voiceSettings.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ElevenLabsVoiceSettings {
    stability: number;       // 0.0-1.0
    similarity_boost: number; // 0.0-1.0
    style: number;            // 0.0-1.0
  }
  export function intensityToVoiceSettings(intensity: number): ElevenLabsVoiceSettings;
  ```
  Task 5 (`/api/voice` route) calls `intensityToVoiceSettings(intensity)` and
  passes the result as `voice_settings` in the ElevenLabs TTS request body.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/voiceSettings.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { intensityToVoiceSettings } from "./voiceSettings";

describe("intensityToVoiceSettings", () => {
  it("returns high stability and low style at minimum intensity (1)", () => {
    const result = intensityToVoiceSettings(1);
    expect(result.stability).toBeCloseTo(0.85, 5);
    expect(result.style).toBeCloseTo(0.0, 5);
    expect(result.similarity_boost).toBeCloseTo(0.75, 5);
  });

  it("returns low stability and high style at maximum intensity (10)", () => {
    const result = intensityToVoiceSettings(10);
    expect(result.stability).toBeCloseTo(0.2, 5);
    expect(result.style).toBeCloseTo(1.0, 5);
    expect(result.similarity_boost).toBeCloseTo(0.75, 5);
  });

  it("is monotonically decreasing in stability as intensity rises", () => {
    let prev = intensityToVoiceSettings(1).stability;
    for (let i = 2; i <= 10; i++) {
      const cur = intensityToVoiceSettings(i).stability;
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });

  it("is monotonically increasing in style as intensity rises", () => {
    let prev = intensityToVoiceSettings(1).style;
    for (let i = 2; i <= 10; i++) {
      const cur = intensityToVoiceSettings(i).style;
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it("clamps intensity below 1 to the level-1 settings", () => {
    expect(intensityToVoiceSettings(0)).toEqual(intensityToVoiceSettings(1));
    expect(intensityToVoiceSettings(-5)).toEqual(intensityToVoiceSettings(1));
  });

  it("clamps intensity above 10 to the level-10 settings", () => {
    expect(intensityToVoiceSettings(11)).toEqual(intensityToVoiceSettings(10));
    expect(intensityToVoiceSettings(999)).toEqual(intensityToVoiceSettings(10));
  });

  it("rounds non-integer intensity down to the nearest level", () => {
    expect(intensityToVoiceSettings(5.7)).toEqual(intensityToVoiceSettings(5));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- voiceSettings`
Expected: FAIL — `src/lib/voiceSettings.ts` does not exist yet.

- [ ] **Step 3: Implement the mapping**

Create `src/lib/voiceSettings.ts`:

```typescript
export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
}

const MIN_INTENSITY = 1;
const MAX_INTENSITY = 10;

const STABILITY_AT_MIN = 0.85;
const STABILITY_AT_MAX = 0.2;
const STYLE_AT_MIN = 0.0;
const STYLE_AT_MAX = 1.0;
const SIMILARITY_BOOST = 0.75;

function clampIntensity(intensity: number): number {
  const floored = Math.floor(intensity);
  return Math.min(MAX_INTENSITY, Math.max(MIN_INTENSITY, floored));
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function intensityToVoiceSettings(
  intensity: number
): ElevenLabsVoiceSettings {
  const clamped = clampIntensity(intensity);
  const t = (clamped - MIN_INTENSITY) / (MAX_INTENSITY - MIN_INTENSITY);

  return {
    stability: lerp(STABILITY_AT_MIN, STABILITY_AT_MAX, t),
    style: lerp(STYLE_AT_MIN, STYLE_AT_MAX, t),
    similarity_boost: SIMILARITY_BOOST,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- voiceSettings`
Expected: PASS, all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voiceSettings.ts src/lib/voiceSettings.test.ts
git commit -m "$(cat <<'EOF'
Add intensity-to-voice-settings mapping

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: In-memory per-IP rate limiter

**Files:**
- Create: `src/lib/rateLimit.ts`
- Test: `src/lib/rateLimit.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface RateLimitResult {
    allowed: boolean;
    retryAfterMs: number; // 0 if allowed
  }
  export function checkRateLimit(
    key: string,
    opts?: { limit?: number; windowMs?: number }
  ): RateLimitResult;
  ```
  Tasks 5 and 6 (`/api/script`, `/api/voice` routes) call
  `checkRateLimit(ip)` at the top of the handler and return HTTP 429 with
  `retryAfterMs` when `allowed` is `false`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/rateLimit.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = `test-key-${Math.random()}`;
    const result = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("blocks requests once the limit is exceeded within the window", () => {
    const key = `test-key-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    const fourth = checkRateLimit(key, opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;
    expect(checkRateLimit(keyA, opts).allowed).toBe(true);
    expect(checkRateLimit(keyB, opts).allowed).toBe(true);
    expect(checkRateLimit(keyA, opts).allowed).toBe(false);
  });

  it("allows requests again after the window elapses", async () => {
    const key = `test-key-${Math.random()}`;
    const opts = { limit: 1, windowMs: 50 };
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(checkRateLimit(key, opts).allowed).toBe(true);
  });

  it("uses sane defaults when opts are omitted", () => {
    const key = `test-key-${Math.random()}`;
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- rateLimit`
Expected: FAIL — `src/lib/rateLimit.ts` does not exist yet.

- [ ] **Step 3: Implement the rate limiter**

Create `src/lib/rateLimit.ts`:

```typescript
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions = {}
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  const retryAfterMs = windowMs - (now - existing.windowStart);
  return { allowed: false, retryAfterMs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- rateLimit`
Expected: PASS, all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "$(cat <<'EOF'
Add in-memory per-key rate limiter

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Relentless Coach system prompt builder

**Files:**
- Create: `src/lib/coachPrompt.ts`
- Test: `src/lib/coachPrompt.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function buildCoachSystemPrompt(intensity: number, duration: number): string;
  ```
  Task 6 (`/api/script` route) calls this to build the OpenAI `system`
  message, passing through the request's `intensity` and `duration` fields.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/coachPrompt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildCoachSystemPrompt } from "./coachPrompt";

describe("buildCoachSystemPrompt", () => {
  it("includes the target intensity level", () => {
    const prompt = buildCoachSystemPrompt(8, 30);
    expect(prompt).toMatch(/intensity/i);
    expect(prompt).toContain("8");
  });

  it("includes the target duration in seconds", () => {
    const prompt = buildCoachSystemPrompt(5, 45);
    expect(prompt).toContain("45");
  });

  it("explicitly forbids impersonating David Goggins", () => {
    const prompt = buildCoachSystemPrompt(5, 30);
    expect(prompt).toMatch(/David Goggins/);
    expect(prompt).toMatch(/not|never|do not|must not/i);
  });

  it("instructs refusal/redirection of self-harm and dangerous content", () => {
    const prompt = buildCoachSystemPrompt(5, 30);
    expect(prompt.toLowerCase()).toContain("self-harm");
    expect(prompt.toLowerCase()).toContain("redirect");
  });

  it("instructs the model to return JSON with script and voice_direction", () => {
    const prompt = buildCoachSystemPrompt(5, 30);
    expect(prompt).toContain("script");
    expect(prompt).toContain("voice_direction");
  });

  it("describes the core character traits from the PRD", () => {
    const prompt = buildCoachSystemPrompt(5, 30);
    expect(prompt.toLowerCase()).toContain("disciplined");
    expect(prompt.toLowerCase()).toContain("direct");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- coachPrompt`
Expected: FAIL — `src/lib/coachPrompt.ts` does not exist yet.

- [ ] **Step 3: Implement the prompt builder**

Create `src/lib/coachPrompt.ts`:

```typescript
export function buildCoachSystemPrompt(
  intensity: number,
  duration: number
): string {
  return `You are Relentless Coach, an original AI motivational persona.

CHARACTER
You are extremely disciplined, direct, intense, confrontational, accountable,
resilient, unapologetic, and action-oriented. You believe discipline beats
motivation, feelings don't determine whether work gets done, discomfort is
part of growth, consistency creates results, excuses need to be confronted,
and the user is responsible for their actions.

STYLE
Use short sentences. Strong statements. Deliberate pauses (render as line
breaks). Repetition. Direct commands. Minimal fluff. High conviction. You are
an intense endurance coach, not a generic motivational speaker.

IDENTITY — CRITICAL
You are NOT David Goggins. Do not claim to be David Goggins, impersonate his
voice or biography, or imply his endorsement of this product. You are an
original relentless coach character only.

INTENSITY
The target intensity for this response is ${intensity} out of 10 (1 = calm and
supportive, 10 = maximum intensity). Scale your word choice, sentence
structure, and aggressiveness to match this level.

DURATION
Write a script that takes approximately ${duration} seconds to speak aloud at
a natural pace.

SAFETY — CRITICAL
If the user's situation input leans toward self-harm, suicide, dangerous
physical behavior, eating disorders, drug use, violence, or abuse, do not
comply with or encourage it. Instead, redirect: stay in character as the
coach, acknowledge the person is struggling, and firmly steer them toward a
safe, constructive action (e.g. reaching out to a trusted person or
professional help). Never give a generic canned refusal and never fail
silently — you must always return a script.

OUTPUT FORMAT
Respond with strict JSON only, matching this shape:
{
  "script": "the full motivational script, using \\n for line breaks/pauses",
  "voice_direction": {
    "pace": "slow | moderate | fast",
    "tone": "string describing vocal tone",
    "emotion": "string describing emotional delivery",
    "pauses": "minimal | occasional | frequent",
    "ending": "string describing how the script should end"
  }
}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- coachPrompt`
Expected: PASS, all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachPrompt.ts src/lib/coachPrompt.test.ts
git commit -m "$(cat <<'EOF'
Add Relentless Coach system prompt builder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `/api/script` route

**Files:**
- Create: `src/app/api/script/route.ts`
- Test: `src/app/api/script/route.test.ts`
- Modify: `package.json` (add `openai` dependency)

**Interfaces:**
- Consumes: `buildCoachSystemPrompt(intensity, duration)` from
  `src/lib/coachPrompt.ts` (Task 5); `checkRateLimit(key, opts)` from
  `src/lib/rateLimit.ts` (Task 4).
- Produces: `POST /api/script` — request body
  `{ situation: string, intensity: number, duration: number }`, success
  response `200 { script: string, voice_direction: { pace: string, tone:
  string, emotion: string, pauses: string, ending: string } }`. Error
  responses: `400` (invalid input), `429` (rate limited, includes
  `retryAfterMs`), `502` (OpenAI upstream failure). Task 8 (frontend) calls
  this route first in the generate flow.

- [ ] **Step 1: Install the OpenAI SDK**

```bash
npm install openai@7.4.0
```

- [ ] **Step 2: Write the failing tests**

Create `src/app/api/script/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

function makeRequest(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost:3000/api/script", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/script", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns 400 when situation is missing", async () => {
    const res = await POST(makeRequest({ intensity: 5, duration: 30 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when situation exceeds 500 characters", async () => {
    const res = await POST(
      makeRequest({ situation: "a".repeat(501), intensity: 5, duration: 30 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when intensity is out of 1-10 range", async () => {
    const res = await POST(
      makeRequest({ situation: "test", intensity: 11, duration: 30 })
    );
    expect(res.status).toBe(400);
  });

  it("returns the script and voice_direction on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              script: "Get up. Do the work.",
              voice_direction: {
                pace: "fast",
                tone: "commanding",
                emotion: "controlled aggression",
                pauses: "frequent",
                ending: "maximum emphasis",
              },
            }),
          },
        },
      ],
    });

    const res = await POST(
      makeRequest({
        situation: "I don't want to study",
        intensity: 8,
        duration: 30,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.script).toBe("Get up. Do the work.");
    expect(json.voice_direction.tone).toBe("commanding");
  });

  it("returns 502 when the OpenAI call fails", async () => {
    mockCreate.mockRejectedValue(new Error("upstream down"));
    const res = await POST(
      makeRequest({ situation: "test", intensity: 5, duration: 30 })
    );
    expect(res.status).toBe(502);
  });

  it("returns 429 when rate limited", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              script: "x",
              voice_direction: {
                pace: "fast",
                tone: "x",
                emotion: "x",
                pauses: "x",
                ending: "x",
              },
            }),
          },
        },
      ],
    });
    const ip = `rate-limit-test-${Math.random()}`;
    let lastRes;
    for (let i = 0; i < 11; i++) {
      lastRes = await POST(
        makeRequest({ situation: "test", intensity: 5, duration: 30 }, ip)
      );
    }
    expect(lastRes!.status).toBe(429);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- route.test.ts`
Expected: FAIL — `src/app/api/script/route.ts` does not exist yet.

- [ ] **Step 4: Implement the route**

Create `src/app/api/script/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildCoachSystemPrompt } from "@/lib/coachPrompt";
import { checkRateLimit } from "@/lib/rateLimit";

interface ScriptRequestBody {
  situation: string;
  intensity: number;
  duration: number;
}

interface VoiceDirection {
  pace: string;
  tone: string;
  emotion: string;
  pauses: string;
  ending: string;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function isValidBody(body: unknown): body is ScriptRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.situation === "string" &&
    b.situation.length > 0 &&
    b.situation.length <= 500 &&
    typeof b.intensity === "number" &&
    b.intensity >= 1 &&
    b.intensity <= 10 &&
    typeof b.duration === "number" &&
    b.duration > 0
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rateLimitResult = checkRateLimit(`script:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rateLimitResult.retryAfterMs },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const systemPrompt = buildCoachSystemPrompt(body.intensity, body.duration);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: body.situation },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content) as {
      script: string;
      voice_direction: VoiceDirection;
    };

    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate script" },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- route.test.ts`
Expected: PASS, all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/script/route.ts src/app/api/script/route.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add /api/script route for OpenAI-powered coach script generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `/api/voice` route

**Files:**
- Create: `src/app/api/voice/route.ts`
- Test: `src/app/api/voice/route.test.ts`
- Modify: `package.json` (add `@elevenlabs/elevenlabs-js` dependency)

**Interfaces:**
- Consumes: `intensityToVoiceSettings(intensity)` from
  `src/lib/voiceSettings.ts` (Task 3); `checkRateLimit(key, opts)` from
  `src/lib/rateLimit.ts` (Task 4).
- Produces: `POST /api/voice` — request body `{ script: string, intensity:
  number }`, success response `200` with `content-type: audio/mpeg` and the
  raw MP3 bytes as the body. Error responses: `400` (invalid input), `429`
  (rate limited), `502` (ElevenLabs upstream failure). Task 8 (frontend)
  calls this route after `/api/script` resolves.

- [ ] **Step 1: Install the ElevenLabs SDK**

```bash
npm install @elevenlabs/elevenlabs-js@2.62.0
```

- [ ] **Step 2: Pick a stock voice and record its ID**

Before writing the route, determine `ELEVENLABS_VOICE_ID`. Use one of
ElevenLabs' premade voices matching "deep, rough, masculine, commanding,
intense, controlled, natural" — e.g. the premade voice named "Adam" (ID
`pNInz6obpgDQGcFmaJgB` in ElevenLabs' standard premade voice library) is a
reasonable fit. Confirm the voice still exists for this account:

```bash
curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices/pNInz6obpgDQGcFmaJgB
```

(Read `ELEVENLABS_API_KEY` from `.env.local` first.) If the voice ID
doesn't resolve, run `curl -s -H "xi-api-key: $ELEVENLABS_API_KEY"
https://api.elevenlabs.io/v1/voices` and pick another premade voice whose
`name`/`labels` best match the character description. Set the chosen ID as
`ELEVENLABS_VOICE_ID` in `.env.local`.

- [ ] **Step 3: Write the failing tests**

Create `src/app/api/voice/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockConvert = vi.fn();

vi.mock("@elevenlabs/elevenlabs-js", () => {
  return {
    ElevenLabsClient: vi.fn().mockImplementation(() => ({
      textToSpeech: {
        convert: mockConvert,
      },
    })),
  };
});

function makeRequest(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost:3000/api/voice", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function* fakeAudioStream() {
  yield new Uint8Array([1, 2, 3]);
  yield new Uint8Array([4, 5, 6]);
}

describe("POST /api/voice", () => {
  beforeEach(() => {
    mockConvert.mockReset();
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_VOICE_ID = "test-voice-id";
  });

  it("returns 400 when script is missing", async () => {
    const res = await POST(makeRequest({ intensity: 5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when intensity is out of range", async () => {
    const res = await POST(makeRequest({ script: "Go.", intensity: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns audio bytes with audio/mpeg content-type on success", async () => {
    mockConvert.mockResolvedValue(fakeAudioStream());

    const res = await POST(makeRequest({ script: "Get up. Do the work.", intensity: 8 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    const buf = await res.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it("returns 502 when ElevenLabs call fails", async () => {
    mockConvert.mockRejectedValue(new Error("upstream down"));
    const res = await POST(makeRequest({ script: "Go.", intensity: 5 }));
    expect(res.status).toBe(502);
  });

  it("returns 429 when rate limited", async () => {
    mockConvert.mockResolvedValue(fakeAudioStream());
    const ip = `rate-limit-test-${Math.random()}`;
    let lastRes;
    for (let i = 0; i < 11; i++) {
      lastRes = await POST(makeRequest({ script: "Go.", intensity: 5 }, ip));
    }
    expect(lastRes!.status).toBe(429);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- api/voice`
Expected: FAIL — `src/app/api/voice/route.ts` does not exist yet.

- [ ] **Step 5: Implement the route**

Create `src/app/api/voice/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { intensityToVoiceSettings } from "@/lib/voiceSettings";
import { checkRateLimit } from "@/lib/rateLimit";

interface VoiceRequestBody {
  script: string;
  intensity: number;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function isValidBody(body: unknown): body is VoiceRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.script === "string" &&
    b.script.length > 0 &&
    typeof b.intensity === "number" &&
    b.intensity >= 1 &&
    b.intensity <= 10
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rateLimitResult = checkRateLimit(`voice:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rateLimitResult.retryAfterMs },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  const voiceSettings = intensityToVoiceSettings(body.intensity);

  try {
    const audioStream = await client.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID as string,
      {
        text: body.script,
        modelId: "eleven_multilingual_v2",
        voiceSettings,
      }
    );

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return new NextResponse(merged, {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- api/voice`
Expected: PASS, all 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/voice/route.ts src/app/api/voice/route.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add /api/voice route for ElevenLabs TTS generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: UI components — presets, intensity slider, audio player

**Files:**
- Create: `src/components/PresetButtons.tsx`
- Create: `src/components/IntensitySlider.tsx`
- Create: `src/components/AudioPlayer.tsx`
- Test: `src/components/PresetButtons.test.tsx`
- Test: `src/components/IntensitySlider.test.tsx`
- Test: `src/components/AudioPlayer.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  // PresetButtons.tsx
  export interface Preset { label: string; situation: string; }
  export const PRESETS: Preset[];
  export function PresetButtons(props: { onSelect: (situation: string) => void }): JSX.Element;

  // IntensitySlider.tsx
  export function IntensitySlider(props: {
    value: number;
    onChange: (value: number) => void;
  }): JSX.Element;

  // AudioPlayer.tsx
  export function AudioPlayer(props: {
    audioUrl: string;
    onRegenerate: () => void;
    regenerating: boolean;
  }): JSX.Element;
  ```
  Task 9 (`page.tsx`) imports and composes all three.

- [ ] **Step 1: Write the failing test for PresetButtons**

Create `src/components/PresetButtons.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetButtons, PRESETS } from "./PresetButtons";

describe("PresetButtons", () => {
  it("renders all six presets from the PRD", () => {
    render(<PresetButtons onSelect={() => {}} />);
    expect(PRESETS).toHaveLength(6);
    expect(screen.getByText("Study")).toBeInTheDocument();
    expect(screen.getByText("Workout")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Discipline")).toBeInTheDocument();
  });

  it("calls onSelect with the preset's situation text when clicked", () => {
    const onSelect = vi.fn();
    render(<PresetButtons onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Study"));
    expect(onSelect).toHaveBeenCalledWith("I don't want to study.");
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- PresetButtons`
Expected: FAIL — `src/components/PresetButtons.tsx` does not exist.

- [ ] **Step 3: Implement PresetButtons**

Create `src/components/PresetButtons.tsx`:

```tsx
export interface Preset {
  label: string;
  situation: string;
}

export const PRESETS: Preset[] = [
  { label: "Study", situation: "I don't want to study." },
  { label: "Workout", situation: "I don't want to train." },
  { label: "Work", situation: "I'm procrastinating." },
  { label: "Morning", situation: "I don't want to get out of bed." },
  { label: "Interview", situation: "I'm nervous about my interview." },
  { label: "Discipline", situation: "I'm breaking promises to myself." },
];

export function PresetButtons({
  onSelect,
}: {
  onSelect: (situation: string) => void;
}) {
  return (
    <div role="group" aria-label="Preset situations">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset.situation)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -- PresetButtons`
Expected: PASS, 2 tests pass.

- [ ] **Step 5: Write the failing test for IntensitySlider**

Create `src/components/IntensitySlider.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntensitySlider } from "./IntensitySlider";

describe("IntensitySlider", () => {
  it("renders a range input with the given value", () => {
    render(<IntensitySlider value={5} onChange={() => {}} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("5");
    expect(slider.min).toBe("1");
    expect(slider.max).toBe("10");
  });

  it("calls onChange with the new numeric value when moved", () => {
    const onChange = vi.fn();
    render(<IntensitySlider value={5} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("shows the anchor label closest to the current value", () => {
    render(<IntensitySlider value={8} onChange={() => {}} />);
    expect(screen.getByText("Relentless")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it, verify it fails**

Run: `npm test -- IntensitySlider`
Expected: FAIL — `src/components/IntensitySlider.tsx` does not exist.

- [ ] **Step 7: Implement IntensitySlider**

Create `src/components/IntensitySlider.tsx`:

```tsx
const ANCHORS: { level: number; label: string }[] = [
  { level: 1, label: "Calm" },
  { level: 3, label: "Firm" },
  { level: 5, label: "Tough" },
  { level: 8, label: "Relentless" },
  { level: 10, label: "Extreme" },
];

function closestAnchorLabel(value: number): string {
  let closest = ANCHORS[0];
  let smallestDiff = Math.abs(value - closest.level);
  for (const anchor of ANCHORS) {
    const diff = Math.abs(value - anchor.level);
    if (diff < smallestDiff) {
      closest = anchor;
      smallestDiff = diff;
    }
  }
  return closest.label;
}

export function IntensitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor="intensity-slider">Intensity: {closestAnchorLabel(value)}</label>
      <input
        id="intensity-slider"
        role="slider"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
```

- [ ] **Step 8: Run it, verify it passes**

Run: `npm test -- IntensitySlider`
Expected: PASS, 3 tests pass.

- [ ] **Step 9: Write the failing test for AudioPlayer**

Create `src/components/AudioPlayer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioPlayer } from "./AudioPlayer";

describe("AudioPlayer", () => {
  it("renders an audio element with the given src", () => {
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={() => {}} regenerating={false} />
    );
    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("src", "blob:test");
  });

  it("renders a download link pointing at the audio url", () => {
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={() => {}} regenerating={false} />
    );
    const link = screen.getByText("Download") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("blob:test");
  });

  it("calls onRegenerate when the Regenerate button is clicked", () => {
    const onRegenerate = vi.fn();
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={onRegenerate} regenerating={false} />
    );
    fireEvent.click(screen.getByText("Regenerate"));
    expect(onRegenerate).toHaveBeenCalled();
  });

  it("disables the Regenerate button while regenerating", () => {
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={() => {}} regenerating={true} />
    );
    expect(screen.getByText("Regenerate")).toBeDisabled();
  });
});
```

- [ ] **Step 10: Run it, verify it fails**

Run: `npm test -- AudioPlayer`
Expected: FAIL — `src/components/AudioPlayer.tsx` does not exist.

- [ ] **Step 11: Implement AudioPlayer**

Create `src/components/AudioPlayer.tsx`:

```tsx
export function AudioPlayer({
  audioUrl,
  onRegenerate,
  regenerating,
}: {
  audioUrl: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div>
      <audio controls src={audioUrl} />
      <div>
        <button type="button" onClick={onRegenerate} disabled={regenerating}>
          Regenerate
        </button>
        <a href={audioUrl} download="relentless-coach.mp3">
          Download
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Run it, verify it passes**

Run: `npm test -- AudioPlayer`
Expected: PASS, 4 tests pass.

- [ ] **Step 13: Run the full test suite**

Run: `npm test`
Expected: PASS, all tests across all files pass.

- [ ] **Step 14: Commit**

```bash
git add src/components/
git commit -m "$(cat <<'EOF'
Add PresetButtons, IntensitySlider, and AudioPlayer components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Main page — wire up the full generate flow

**Files:**
- Modify: `src/app/page.tsx` (replace default `create-next-app` starter
  content entirely)
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `PresetButtons` (Task 8), `IntensitySlider` (Task 8),
  `AudioPlayer` (Task 8); `POST /api/script` and `POST /api/voice` (Tasks 6, 7).
- Produces: the complete user-facing page at `/`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "./page";

const originalFetch = global.fetch;

describe("Home page", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders the situation input and generate button", () => {
    render(<Page />);
    expect(
      screen.getByPlaceholderText("What's stopping you?")
    ).toBeInTheDocument();
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("disables Generate while a request is in flight and reveals script then audio", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            script: "Get up. Do the work.",
            voice_direction: {
              pace: "fast",
              tone: "commanding",
              emotion: "controlled aggression",
              pauses: "frequent",
              ending: "maximum emphasis",
            },
          }),
      } as Response)
    );
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(["audio"], { type: "audio/mpeg" })),
      } as unknown as Response)
    );

    render(<Page />);
    fireEvent.change(screen.getByPlaceholderText("What's stopping you?"), {
      target: { value: "I don't want to study" },
    });
    fireEvent.click(screen.getByText("Generate"));

    expect(screen.getByText("Generate")).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByText("Get up. Do the work.")).toBeInTheDocument()
    );

    await waitFor(() =>
      expect(document.querySelector("audio")).toBeInTheDocument()
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/script",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/voice",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an inline error with retry when /api/script fails", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: "Failed to generate script" }),
      } as Response)
    );

    render(<Page />);
    fireEvent.change(screen.getByPlaceholderText("What's stopping you?"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() =>
      expect(screen.getByText(/failed to generate script/i)).toBeInTheDocument()
    );
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("fills the textarea when a preset is clicked", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("Study"));
    const textarea = screen.getByPlaceholderText(
      "What's stopping you?"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("I don't want to study.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- page.test.tsx`
Expected: FAIL — `page.tsx` still renders the `create-next-app` starter
content, none of the queried elements exist.

- [ ] **Step 3: Implement the page**

Replace the full contents of `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { PresetButtons } from "@/components/PresetButtons";
import { IntensitySlider } from "@/components/IntensitySlider";
import { AudioPlayer } from "@/components/AudioPlayer";

const DURATION_SECONDS = 30;

type Phase = "idle" | "generating-script" | "generating-voice" | "done" | "error";

export default function Page() {
  const [situation, setSituation] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [phase, setPhase] = useState<Phase>("idle");
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function generate() {
    setErrorMessage("");
    setScript("");
    setAudioUrl("");
    setPhase("generating-script");

    let scriptResult: string;
    try {
      const scriptRes = await fetch("/api/script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          situation,
          intensity,
          duration: DURATION_SECONDS,
        }),
      });
      if (!scriptRes.ok) {
        const body = await scriptRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate script");
      }
      const data = await scriptRes.json();
      scriptResult = data.script;
      setScript(scriptResult);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate script");
      setPhase("error");
      return;
    }

    setPhase("generating-voice");
    try {
      const voiceRes = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ script: scriptResult, intensity }),
      });
      if (!voiceRes.ok) {
        const body = await voiceRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate audio");
      }
      const blob = await voiceRes.blob();
      setAudioUrl(URL.createObjectURL(blob));
      setPhase("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate audio");
      setPhase("error");
    }
  }

  const isBusy = phase === "generating-script" || phase === "generating-voice";

  return (
    <main>
      <h1>Relentless Coach</h1>

      <PresetButtons onSelect={setSituation} />

      <textarea
        placeholder="What's stopping you?"
        maxLength={500}
        value={situation}
        onChange={(e) => setSituation(e.target.value)}
      />

      <IntensitySlider value={intensity} onChange={setIntensity} />

      <button type="button" onClick={generate} disabled={isBusy || situation.length === 0}>
        Generate
      </button>

      {phase === "generating-voice" && <p>generating voice…</p>}

      {script && <p>{script}</p>}

      {audioUrl && (
        <AudioPlayer
          audioUrl={audioUrl}
          onRegenerate={generate}
          regenerating={isBusy}
        />
      )}

      {phase === "error" && (
        <div>
          <p>{errorMessage}</p>
          <button type="button" onClick={generate}>
            Retry
          </button>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- page.test.tsx`
Expected: PASS, all 4 tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS, every test file in the project passes.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "$(cat <<'EOF'
Wire up main page: presets, intensity, generate flow, audio player

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Manual end-to-end verification

**Files:** none (verification only)

**Interfaces:** none — this task exercises the whole system built in Tasks
1-9 through a real browser.

- [ ] **Step 1: Confirm real secrets are present**

Open `.env.local` and confirm `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, and
`ELEVENLABS_VOICE_ID` all have real, non-empty values. If `OPENAI_API_KEY`
is still blank, stop and ask the user to supply it — it cannot be generated.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: server ready on `http://localhost:3000`.

- [ ] **Step 3: Walk the golden path in a browser**

Open `http://localhost:3000`. Click the "Study" preset, confirm the textarea
fills with "I don't want to study." Set intensity to 8 ("Relentless"). Click
Generate. Confirm: Generate button disables, the script text appears within
a few seconds, a "generating voice…" indicator shows, then an audio player
appears. Press play and confirm audio is audible and matches the script's
intensity. Click Download and confirm an mp3 file downloads. Click
Regenerate and confirm a new script/audio pair is produced.

- [ ] **Step 4: Walk the safety-redirect path**

Enter a situation input that leans toward self-harm (e.g. "I want to hurt
myself"). Click Generate. Confirm the response is an in-character redirection
toward safety/help — not a script that encourages the behavior, and not a
generic refusal or blank/broken output.

- [ ] **Step 5: Walk the error path**

Temporarily set `OPENAI_API_KEY` in `.env.local` to an invalid value, restart
`npm run dev`, click Generate. Confirm an inline error message with a Retry
button appears (no silent failure, no crash). Restore the correct
`OPENAI_API_KEY` and restart the dev server afterward.

- [ ] **Step 6: Confirm rate limiting works**

Click Generate more than 10 times within a minute (reuse the same short
situation to move fast). Confirm that after the 10th request, subsequent
requests return the rate-limit error state instead of hanging or crashing.

- [ ] **Step 7: Report results**

Summarize which of steps 3-6 passed and any deviations observed. Do not mark
this task complete until the golden path (Step 3) and the safety-redirect
path (Step 4) both pass.

---

## Self-Review Notes

- **Spec coverage:** §2 scope items all covered (Tasks 6-9 for LLM/TTS/UI,
  Task 4 for rate limiting). §3 architecture (two routes, no DB) matches
  Tasks 6-7. §4 LLM behavior (persona, safety, JSON output) covered in Task
  5's prompt + Task 6's route/tests. §5 voice mapping covered in Task 3. §6
  UI flow (presets, slider, generate, script reveal, audio player, error
  handling) covered in Tasks 8-9. §7 secrets/gitignore covered in Task 1. §8
  testing approach (unit, route-level mocked, manual) covered in Tasks 3-4
  (unit), 6-7 (route-level mocked), 10 (manual). §9 deferred items are not
  built anywhere in this plan, as intended.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code or
  literal shell commands.
- **Type consistency:** `intensityToVoiceSettings` (Task 3) returns
  `ElevenLabsVoiceSettings` and is consumed with that exact name in Task 7's
  route. `buildCoachSystemPrompt(intensity, duration)` (Task 5) matches its
  call in Task 6. `checkRateLimit(key, opts)` (Task 4) matches its calls in
  Tasks 6 and 7. Component prop signatures declared in Task 8's Interfaces
  block match their usage in Task 9's `page.tsx`.
