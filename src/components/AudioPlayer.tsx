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
    <div className="player">
      <div className="player-frame">
        <audio controls src={audioUrl} />
      </div>
      <div className="player-actions">
        <button
          type="button"
          className="ghost-btn"
          onClick={onRegenerate}
          disabled={regenerating}
        >
          Regenerate
        </button>
        <a className="ghost-btn" href={audioUrl} download="relentless-coach.mp3">
          Download
        </a>
      </div>
    </div>
  );
}
