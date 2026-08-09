import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "./page";

const originalFetch = global.fetch;

describe("Home page", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders the situation input and generate button", () => {
    render(<Page />);
    expect(
      screen.getByPlaceholderText("What's stopping you?")
    ).toBeInTheDocument();
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("disables Generate while a request is in flight and reveals script then audio", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            script: "Get up. Do the work.",
            voice_direction: {
              pace: "fast",
              tone: "commanding",
              emotion: "controlled aggression",
              pauses: "frequent",
              ending: "maximum emphasis",
            },
          }),
      } as Response)
    );
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(["audio"], { type: "audio/mpeg" })),
      } as unknown as Response)
    );

    render(<Page />);
    fireEvent.change(screen.getByPlaceholderText("What's stopping you?"), {
      target: { value: "I don't want to study" },
    });
    fireEvent.click(screen.getByText("Generate"));

    expect(screen.getByText("Generate")).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByText("Get up. Do the work.")).toBeInTheDocument()
    );

    await waitFor(() =>
      expect(document.querySelector("audio")).toBeInTheDocument()
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/script",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/voice",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an inline error with retry when /api/script fails", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: "Failed to generate script" }),
      } as Response)
    );

    render(<Page />);
    fireEvent.change(screen.getByPlaceholderText("What's stopping you?"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() =>
      expect(screen.getByText(/failed to generate script/i)).toBeInTheDocument()
    );
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("fills the textarea when a preset is clicked", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("Study"));
    const textarea = screen.getByPlaceholderText(
      "What's stopping you?"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("I don't want to study.");
  });
});
