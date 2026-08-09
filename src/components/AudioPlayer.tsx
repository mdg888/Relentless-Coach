export function AudioPlayer({
  audioUrl,
  onRegenerate,
  regenerating,
}: {
  audioUrl: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div>
      <audio controls src={audioUrl} />
      <div>
        <button type="button" onClick={onRegenerate} disabled={regenerating}>
          Regenerate
        </button>
        <a href={audioUrl} download="relentless-coach.mp3">
          Download
        </a>
      </div>
    </div>
  );
}
