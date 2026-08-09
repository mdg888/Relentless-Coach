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
