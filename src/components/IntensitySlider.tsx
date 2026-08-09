const ANCHORS: { level: number; label: string }[] = [
  { level: 1, label: "Calm" },
  { level: 3, label: "Firm" },
  { level: 5, label: "Tough" },
  { level: 8, label: "Relentless" },
  { level: 10, label: "Extreme" },
];

function closestAnchorLabel(value: number): string {
  let closest = ANCHORS[0];
  let smallestDiff = Math.abs(value - closest.level);
  for (const anchor of ANCHORS) {
    const diff = Math.abs(value - anchor.level);
    if (diff < smallestDiff) {
      closest = anchor;
      smallestDiff = diff;
    }
  }
  return closest.label;
}

function pressureColor(value: number): string {
  const t = Math.min(1, Math.max(0, (value - 1) / 9));
  const eased = t * t;
  const from = [138, 131, 120];
  const to = [196, 67, 46];
  const mix = from.map((c, i) => Math.round(c + (to[i] - c) * eased));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

export function IntensitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className="intensity"
      style={{ "--intensity-color": pressureColor(value) } as React.CSSProperties}
    >
      <label htmlFor="intensity-slider" className="intensity-head">
        Intensity
        <span className="intensity-value">{closestAnchorLabel(value)}</span>
      </label>
      <div className="fader">
        <div className="fader-track" />
        <div className="fader-ticks" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <input
          id="intensity-slider"
          role="slider"
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <div className="fader-bounds">
        <span>Calm</span>
        <span>Extreme</span>
      </div>
    </div>
  );
}
