import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { VoiceInputButton } from "./VoiceInputButton";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const composerSetText = vi.fn();
const composerGetState = vi.fn().mockReturnValue({ text: "" });
const ensureModelLoadedMock = vi.fn().mockResolvedValue(undefined);
const isModelDownloadedMock = vi.fn().mockResolvedValue(false);
const transcribeMock = vi.fn().mockResolvedValue("hello world");

const { notificationShowMock } = vi.hoisted(() => {
  return { notificationShowMock: vi.fn() };
});

vi.mock("@mantine/notifications", async () => {
  const actual =
    await vi.importActual<typeof import("@mantine/notifications")>(
      "@mantine/notifications",
    );
  return {
    ...actual,
    notifications: {
      ...actual.notifications,
      show: notificationShowMock,
    },
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useComposerRuntime: () => {
      return {
        setText: composerSetText,
        getState: composerGetState,
      };
    },
  };
});

vi.mock("@/lib/voice/useVoiceModelManager", () => {
  return {
    useVoiceModelManager: () => {
      return {
        ensureModelLoaded: ensureModelLoadedMock,
        isModelDownloaded: isModelDownloadedMock,
        transcribe: transcribeMock,
        getStatus: () => {
          return { kind: "idle" };
        },
        subscribe: () => {
          return () => {
            return undefined;
          };
        },
      };
    },
    useVoiceModelStatus: () => {
      return { kind: "idle" };
    },
  };
});

vi.mock("@/lib/voice/audioCapture", () => {
  return {
    startMicrophoneRecording: vi.fn(),
  };
});

describe("VoiceInputButton", () => {
  beforeEach(() => {
    composerSetText.mockClear();
    ensureModelLoadedMock.mockClear();
    isModelDownloadedMock.mockClear();
    transcribeMock.mockClear();
    notificationShowMock.mockClear();
    window.localStorage.clear();
  });

  it("renders a microphone button with a setup tooltip when no model is downloaded", async () => {
    isModelDownloadedMock.mockResolvedValueOnce(false);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    const button = await screen.findByRole("button", {
      name: /set up voice prompting/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("opens the download prompt when clicked and no model is downloaded", async () => {
    isModelDownloadedMock.mockResolvedValueOnce(false);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    const button = await screen.findByRole("button", {
      name: /set up voice prompting/i,
    });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(
      await screen.findByText(/enable voice prompting/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download & enable/i }),
    ).toBeInTheDocument();
    expect(ensureModelLoadedMock).not.toHaveBeenCalled();
  });

  it("kicks off ensureModelLoaded when the user confirms the download", async () => {
    isModelDownloadedMock.mockResolvedValueOnce(false);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", {
          name: /set up voice prompting/i,
        }),
      );
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /download & enable/i }),
      );
    });

    expect(ensureModelLoadedMock).toHaveBeenCalledWith("whisper-tiny");
  });

  it("fires a success toast when the download completes", async () => {
    isModelDownloadedMock.mockResolvedValueOnce(false);
    ensureModelLoadedMock.mockResolvedValueOnce(undefined);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", {
          name: /set up voice prompting/i,
        }),
      );
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /download & enable/i }),
      );
    });

    await waitFor(() => {
      expect(notificationShowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Voice model ready",
          color: "success",
        }),
      );
    });
  });

  it("fires a danger toast when the download fails", async () => {
    isModelDownloadedMock.mockResolvedValueOnce(false);
    ensureModelLoadedMock.mockRejectedValueOnce(new Error("disk full"));
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", {
          name: /set up voice prompting/i,
        }),
      );
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /download & enable/i }),
      );
    });

    await waitFor(() => {
      expect(notificationShowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Voice model download failed",
          color: "danger",
          message: "disk full",
        }),
      );
    });
  });

  it("disables the button when the disabled prop is set", () => {
    render(
      <AvandarUiProvider>
        <VoiceInputButton disabled />
      </AvandarUiProvider>,
    );

    const button = screen.getByRole("button", {
      name: /set up voice prompting/i,
    });
    expect(button).toBeDisabled();
  });
});
