import { I18nProvider } from "@lingui/react";
import { ModalsProvider } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { i18n } from "@/i18n/i18n";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { VoiceInputButton } from "./VoiceInputButton";
import type { ReactElement } from "react";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const composerSetText = vi.fn();
const composerGetState = vi.fn().mockReturnValue({ text: "" });
const {
  ensureModelLoadedMock,
  deleteModelMock,
  isModelDownloadedMock,
  transcribeMock,
  releaseLoadedPipelineMock,
  voiceManagerMock,
  notificationShowMock,
  startMicrophoneRecordingMock,
} = vi.hoisted(() => {
  const ensureModelDownloaded = vi.fn().mockResolvedValue(undefined);
  const ensureModelLoaded = vi.fn().mockResolvedValue(undefined);
  const deleteModel = vi.fn().mockResolvedValue(undefined);
  const isModelDownloaded = vi.fn().mockResolvedValue(false);
  const transcribe = vi.fn().mockResolvedValue("hello world");
  const releaseLoadedPipeline = vi.fn().mockResolvedValue(undefined);
  return {
    ensureModelDownloadedMock: ensureModelDownloaded,
    ensureModelLoadedMock: ensureModelLoaded,
    deleteModelMock: deleteModel,
    isModelDownloadedMock: isModelDownloaded,
    transcribeMock: transcribe,
    releaseLoadedPipelineMock: releaseLoadedPipeline,
    voiceManagerMock: {
      ensureModelDownloaded,
      ensureModelLoaded,
      deleteModel,
      isModelDownloaded,
      transcribe,
      releaseLoadedPipeline,
      getStatus: () => {
        return { kind: "idle" as const };
      },
      subscribe: () => {
        return () => {
          return undefined;
        };
      },
    },
    notificationShowMock: vi.fn(),
    startMicrophoneRecordingMock: vi.fn(),
  };
});

vi.mock("@mantine/notifications", async () => {
  const actual = await vi.importActual<typeof import("@mantine/notifications")>(
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
      return voiceManagerMock;
    },
    useVoiceModelStatus: () => {
      return { kind: "idle" };
    },
  };
});

vi.mock("@/hooks/usePlatformInfo/usePlatformInfo", () => {
  return {
    usePlatformInfo: () => {
      return "web";
    },
  };
});

vi.mock("@/lib/voice/audioCapture", () => {
  return {
    startMicrophoneRecording: startMicrophoneRecordingMock,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-test" };
    },
  };
});

const workspaceLocaleRef = { current: "en" as string };

vi.mock("@/i18n/useLanguagePreference", () => {
  return {
    useWorkspaceLanguage: () => {
      return {
        locale: workspaceLocaleRef.current,
        setLocale: vi.fn(),
      };
    },
  };
});

function renderVoiceButton(ui: ReactElement = <VoiceInputButton />) {
  return render(
    <I18nProvider i18n={i18n}>
      <AvandarUiProvider>
        <ModalsProvider>{ui}</ModalsProvider>
      </AvandarUiProvider>
    </I18nProvider>,
  );
}

describe("VoiceInputButton", () => {
  beforeEach(() => {
    composerSetText.mockClear();
    ensureModelLoadedMock.mockClear();
    deleteModelMock.mockClear();
    isModelDownloadedMock.mockClear();
    isModelDownloadedMock.mockResolvedValue(false);
    transcribeMock.mockClear();
    releaseLoadedPipelineMock.mockClear();
    notificationShowMock.mockClear();
    workspaceLocaleRef.current = "en";
    window.localStorage.clear();
    startMicrophoneRecordingMock.mockReset();
  });

  it("shows stop, language, and cancel controls while recording", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    startMicrophoneRecordingMock.mockResolvedValue({
      stop: vi.fn().mockResolvedValue(new Float32Array([0])),
    });
    renderVoiceButton();

    const micButton = await screen.findByRole("button", {
      name: /^Speak$/i,
    });
    await act(async () => {
      fireEvent.click(micButton);
    });

    expect(
      await screen.findByRole("button", { name: /stop and transcribe/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /^cancel$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/transcription language: english/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /end recording/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the voice pipeline loaded after a successful transcription", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    const stopMock = vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2]));
    startMicrophoneRecordingMock.mockResolvedValue({
      stop: stopMock,
    });
    renderVoiceButton();

    const micButton = await screen.findByRole("button", {
      name: /^Speak$/i,
    });
    await act(async () => {
      fireEvent.click(micButton);
    });

    const stopButton = await screen.findByRole("button", {
      name: /stop and transcribe/i,
    });
    await act(async () => {
      fireEvent.click(stopButton);
    });

    await waitFor(() => {
      expect(transcribeMock).toHaveBeenCalled();
    });
    expect(releaseLoadedPipelineMock).not.toHaveBeenCalled();
    expect(composerSetText).toHaveBeenCalledWith("hello world");
  });

  it("discards audio when cancel is clicked during recording", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    const stopMock = vi.fn().mockResolvedValue(new Float32Array([0]));
    startMicrophoneRecordingMock.mockResolvedValue({
      stop: stopMock,
    });
    renderVoiceButton();

    const micButton = await screen.findByRole("button", {
      name: /^Speak$/i,
    });
    await act(async () => {
      fireEvent.click(micButton);
    });

    const cancelButton = await screen.findByRole("button", {
      name: /^cancel$/i,
    });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(stopMock).toHaveBeenCalled();
    expect(transcribeMock).not.toHaveBeenCalled();
    expect(composerSetText).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /stop and transcribe/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a microphone button with a setup tooltip when no model is downloaded", async () => {
    renderVoiceButton();

    const button = await screen.findByRole("button", {
      name: /set up voice prompting/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("opens the download prompt when clicked and no model is downloaded", async () => {
    renderVoiceButton();

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
      screen.getByRole("button", { name: /^Download$/i }),
    ).toBeInTheDocument();
    expect(ensureModelLoadedMock).not.toHaveBeenCalled();
  });

  it("kicks off ensureModelLoaded when the user confirms the download", async () => {
    renderVoiceButton();

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", {
          name: /set up voice prompting/i,
        }),
      );
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /^Download$/i }),
      );
    });

    expect(ensureModelLoadedMock).toHaveBeenCalledWith("whisper-tiny");
  });

  it("fires a success toast when the download completes", async () => {
    ensureModelLoadedMock.mockImplementation(async () => {
      isModelDownloadedMock.mockResolvedValue(true);
    });
    renderVoiceButton();

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", {
          name: /set up voice prompting/i,
        }),
      );
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /^Download$/i }),
      );
    });

    await waitFor(() => {
      expect(notificationShowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Voice model saved",
          color: "success",
        }),
      );
    });
  });

  it("fires a danger toast when the download fails", async () => {
    ensureModelLoadedMock.mockRejectedValueOnce(new Error("disk full"));
    renderVoiceButton();

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", {
          name: /set up voice prompting/i,
        }),
      );
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /^Download$/i }),
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

  it("does not render voice settings until a model is downloaded locally", async () => {
    isModelDownloadedMock.mockResolvedValue(false);
    renderVoiceButton();

    await screen.findByRole("button", { name: /set up voice prompting/i });
    expect(
      screen.queryByRole("button", { name: /voice settings/i }),
    ).not.toBeInTheDocument();
  });

  it("renders voice settings after a model is present in the local cache", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    renderVoiceButton();

    expect(
      await screen.findByRole("button", { name: /voice settings/i }),
    ).toBeInTheDocument();
  });

  it("defaults the language picker to the workspace locale when nothing is stored", async () => {
    workspaceLocaleRef.current = "es";
    isModelDownloadedMock.mockResolvedValue(true);
    renderVoiceButton();

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    const languageInput = await screen.findByRole("combobox", {
      name: /language/i,
    });
    expect((languageInput as HTMLInputElement).value).toBe("Español");
  });

  it("shows an explicit download button when the selected model is not cached", async () => {
    window.localStorage.setItem("avandar.voice.modelId", "whisper-base");
    isModelDownloadedMock.mockImplementation(async (id: string) => {
      return id === "whisper-tiny";
    });
    renderVoiceButton();

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^download$/i }),
      ).toBeInTheDocument();
    });
    expect(ensureModelLoadedMock).not.toHaveBeenCalled();
  });

  it("uses a stored voice language instead of the workspace locale", async () => {
    workspaceLocaleRef.current = "es";
    window.localStorage.setItem("avandar.voice.language", "english");
    isModelDownloadedMock.mockResolvedValue(true);
    renderVoiceButton();

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    const languageInput = await screen.findByRole("combobox", {
      name: /language/i,
    });
    expect((languageInput as HTMLInputElement).value).toBe("English");
  });

  it("falls back to English when the workspace locale has no voice mapping", async () => {
    workspaceLocaleRef.current = "ar";
    isModelDownloadedMock.mockResolvedValue(true);
    renderVoiceButton();

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    const languageInput = await screen.findByRole("combobox", {
      name: /language/i,
    });
    expect((languageInput as HTMLInputElement).value).toBe("English");
  });

  it("shows a remove control for each downloaded model in voice settings", async () => {
    isModelDownloadedMock.mockImplementation(async (id: string) => {
      return id === "whisper-tiny" || id === "whisper-base";
    });
    renderVoiceButton();

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", {
        name: /^remove whisper/i,
      });
      expect(removeButtons).toHaveLength(2);
    });
  });

  it("deletes a model from cache and hides settings when the last model is removed", async () => {
    isModelDownloadedMock.mockImplementation(async (id: string) => {
      return id === "whisper-tiny";
    });
    deleteModelMock.mockImplementation(async () => {
      isModelDownloadedMock.mockImplementation(async () => {
        return false;
      });
    });
    renderVoiceButton();

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    const removeButton = await screen.findByRole("button", {
      name: /remove whisper tiny/i,
    });
    await act(async () => {
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(deleteModelMock).toHaveBeenCalledWith("whisper-tiny");
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /voice settings/i }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole("button", { name: /set up voice prompting/i }),
    ).toBeInTheDocument();
  });

  it("disables the button when the disabled prop is set", () => {
    renderVoiceButton(<VoiceInputButton disabled />);

    const button = screen.getByRole("button", {
      name: /set up voice prompting/i,
    });
    expect(button).toBeDisabled();
  });
});
