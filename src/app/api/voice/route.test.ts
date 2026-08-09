import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockConvert = vi.fn();

vi.mock("@elevenlabs/elevenlabs-js", () => {
  return {
    ElevenLabsClient: vi.fn().mockImplementation(function () {
      return {
        textToSpeech: {
          convert: mockConvert,
        },
      };
    }),
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

  it("returns 400 when script exceeds 5000 characters", async () => {
    const res = await POST(
      makeRequest({ script: "a".repeat(5001), intensity: 5 })
    );
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
