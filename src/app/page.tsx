"use client";

import { useState } from "react";
import { PresetButtons } from "@/components/PresetButtons";
import { IntensitySlider } from "@/components/IntensitySlider";
import { AudioPlayer } from "@/components/AudioPlayer";

const DURATION_SECONDS = 30;

type Phase = "idle" | "generating-script" | "generating-voice" | "done" | "error";

function extractErrorMessage(body: { error?: string; retryAfterMs?: number }, fallback: string): string {
  if (typeof body.retryAfterMs === "number") {
    const seconds = Math.ceil(body.retryAfterMs / 1000);
    return `Rate limit exceeded — try again in ${seconds}s`;
  }
  return body.error ?? fallback;
}

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
        throw new Error(extractErrorMessage(body, "Failed to generate script"));
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
        throw new Error(extractErrorMessage(body, "Failed to generate audio"));
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
    <main className="page">
      <div className="mark">
        RELENTLESS <span>COACH</span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="situation">
          Confess it
        </label>
        <textarea
          id="situation"
          placeholder="What's stopping you?"
          maxLength={500}
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
        />
        <span className="field-count">{situation.length}/500</span>
      </div>

      <PresetButtons onSelect={setSituation} />

      <IntensitySlider value={intensity} onChange={setIntensity} />

      <button
        type="button"
        className="strike"
        onClick={generate}
        disabled={isBusy || situation.length === 0}
      >
        {isBusy ? "Working" : "Hit Me"}
      </button>

      {phase === "generating-voice" && (
        <p className="status">Recording the verdict</p>
      )}

      {script && (
        <div className="verdict">
          <span className="verdict-label">The verdict</span>
          <p className="verdict-script">{script}</p>

          {audioUrl && (
            <AudioPlayer
              audioUrl={audioUrl}
              onRegenerate={generate}
              regenerating={isBusy}
            />
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="alert">
          <p>{errorMessage}</p>
          <button type="button" onClick={generate}>
            Retry
          </button>
        </div>
      )}
    </main>
  );
}
