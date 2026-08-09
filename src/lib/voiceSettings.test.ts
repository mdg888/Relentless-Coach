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
