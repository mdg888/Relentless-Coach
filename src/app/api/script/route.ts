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
