import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
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
