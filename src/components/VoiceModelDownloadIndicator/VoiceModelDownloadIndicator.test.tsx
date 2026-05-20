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

  it("shows one progress row per file and the tab-close warning", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "whisper-base",
      phase: "files",
      files: [
        {
          fileName: "model.onnx",
          progressPercent: 100,
          state: "complete",
        },
        {
          fileName: "tokenizer.json",
          progressPercent: 42,
          state: "downloading",
        },
      ],
    };
    render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );

    expect(
      screen.getByText(/Whisper Base \(multilingual\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText("model.onnx")).toBeInTheDocument();
    expect(screen.getByText("tokenizer.json")).toBeInTheDocument();
    expect(
      screen.getByText(/Do not refresh or close this tab/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("shows a loading note when assets are fetched but the runtime is still starting", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "whisper-tiny",
      phase: "loading",
      files: [
        {
          fileName: "model.onnx",
          progressPercent: 100,
          state: "complete",
        },
        {
          fileName: "Loading into memory…",
          progressPercent: 0,
          state: "downloading",
        },
      ],
    };
    render(
      <AvandarUiProvider>
        <VoiceModelDownloadIndicator />
      </AvandarUiProvider>,
    );

    expect(screen.getByText(/Finishing setup/i)).toBeInTheDocument();
    expect(screen.getByText("Loading into memory…")).toBeInTheDocument();
  });
});
