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
