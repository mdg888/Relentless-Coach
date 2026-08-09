export interface Preset {
  label: string;
  situation: string;
}

export const PRESETS: Preset[] = [
  { label: "Study", situation: "I don't want to study." },
  { label: "Workout", situation: "I don't want to train." },
  { label: "Work", situation: "I'm procrastinating." },
  { label: "Morning", situation: "I don't want to get out of bed." },
  { label: "Interview", situation: "I'm nervous about my interview." },
  { label: "Discipline", situation: "I'm breaking promises to myself." },
];

export function PresetButtons({
  onSelect,
}: {
  onSelect: (situation: string) => void;
}) {
  return (
    <div className="presets" role="group" aria-label="Preset situations">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className="preset-btn"
          onClick={() => onSelect(preset.situation)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
