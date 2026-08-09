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

export function IntensitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor="intensity-slider">
        Intensity: <span>{closestAnchorLabel(value)}</span>
      </label>
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
  );
}
