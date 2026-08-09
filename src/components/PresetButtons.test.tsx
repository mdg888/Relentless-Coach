import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetButtons, PRESETS } from "./PresetButtons";

describe("PresetButtons", () => {
  it("renders all six presets from the PRD", () => {
    render(<PresetButtons onSelect={() => {}} />);
    expect(PRESETS).toHaveLength(6);
    expect(screen.getByText("Study")).toBeInTheDocument();
    expect(screen.getByText("Workout")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Discipline")).toBeInTheDocument();
  });

  it("calls onSelect with the preset's situation text when clicked", () => {
    const onSelect = vi.fn();
    render(<PresetButtons onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Study"));
    expect(onSelect).toHaveBeenCalledWith("I don't want to study.");
  });
});
