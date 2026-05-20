import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { VoiceModelDownloadIndicator } from "./VoiceModelDownloadIndicator";
import type { VoiceManagerStatus } from "@/lib/voice/voiceManagerInterface";

let mockStatus: VoiceManagerStatus = { kind: "idle" };

vi.mock("@/lib/voice/useVoiceModelManager", () => {
  return {
    useVoiceModelStatus: () => {
      return mockStatus;
    },
  };
});

describe("VoiceModelDownloadIndicator", () => {
  afterEach(() => {
    mockStatus = { kind: "idle" };
  });

  it("renders nothing in the idle state", () => {
    mockStatus = { kind: "idle" };
    render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing in the ready state", () => {
    mockStatus = { kind: "ready", modelId: "whisper-tiny" };
    render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the model name and the percent label while downloading", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "whisper-base",
      progressPercent: 42,
      currentFile: "ggml-base.bin",
    };
    render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );

    expect(
      screen.getByText(/Whisper Base \(multilingual\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText(/ggml-base.bin/)).toBeInTheDocument();
    // The aria-live region exposes the tooltip label for screen readers.
    expect(screen.getByRole("status").getAttribute("aria-label")).toMatch(
      /Downloading .* for voice prompting/i,
    );
  });

  it("shows a 'Starting…' label when percent is indeterminate", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "whisper-tiny",
      progressPercent: -1,
    };
    render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );

    expect(
      screen.getByText(/Preparing local voice model/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Starting…")).toBeInTheDocument();
  });

  it("keeps a single determinate progress bar when percent updates", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "whisper-tiny",
      progressPercent: -1,
    };
    const { rerender } = render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );

    mockStatus = {
      kind: "downloading",
      modelId: "whisper-tiny",
      progressPercent: 42,
      currentFile: "model.onnx",
    };
    rerender(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("Starting…")).not.toBeInTheDocument();
  });
});
