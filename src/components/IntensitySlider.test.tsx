import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntensitySlider } from "./IntensitySlider";

describe("IntensitySlider", () => {
  it("renders a range input with the given value", () => {
    render(<IntensitySlider value={5} onChange={() => {}} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("5");
    expect(slider.min).toBe("1");
    expect(slider.max).toBe("10");
  });

  it("calls onChange with the new numeric value when moved", () => {
    const onChange = vi.fn();
    render(<IntensitySlider value={5} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("shows the anchor label closest to the current value", () => {
    render(<IntensitySlider value={8} onChange={() => {}} />);
    expect(screen.getByText("Relentless")).toBeInTheDocument();
  });
});
