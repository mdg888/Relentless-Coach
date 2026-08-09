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
