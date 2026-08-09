import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api";
import { intensityToVoiceSettings } from "@/lib/voiceSettings";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_SCRIPT_LENGTH = 5000;

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
    b.script.length <= MAX_SCRIPT_LENGTH &&
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
  const voiceSettings: VoiceSettings = intensityToVoiceSettings(body.intensity);

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
    for await (const chunk of audioStream as unknown as AsyncIterable<Uint8Array>) {
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
