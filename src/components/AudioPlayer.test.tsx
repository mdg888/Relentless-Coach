import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioPlayer } from "./AudioPlayer";

describe("AudioPlayer", () => {
  it("renders an audio element with the given src", () => {
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={() => {}} regenerating={false} />
    );
    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("src", "blob:test");
  });

  it("renders a download link pointing at the audio url", () => {
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={() => {}} regenerating={false} />
    );
    const link = screen.getByText("Download") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("blob:test");
  });

  it("calls onRegenerate when the Regenerate button is clicked", () => {
    const onRegenerate = vi.fn();
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={onRegenerate} regenerating={false} />
    );
    fireEvent.click(screen.getByText("Regenerate"));
    expect(onRegenerate).toHaveBeenCalled();
  });

  it("disables the Regenerate button while regenerating", () => {
    render(
      <AudioPlayer audioUrl="blob:test" onRegenerate={() => {}} regenerating={true} />
    );
    expect(screen.getByText("Regenerate")).toBeDisabled();
  });
});
