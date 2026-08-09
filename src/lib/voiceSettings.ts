export interface ElevenLabsVoiceSettings {
  stability: number;
  similarityBoost: number;
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
    similarityBoost: SIMILARITY_BOOST,
  };
}
