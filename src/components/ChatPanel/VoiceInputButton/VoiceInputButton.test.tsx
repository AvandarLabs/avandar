import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { VoiceInputButton } from "./VoiceInputButton";

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
  voiceManagerMock,
  notificationShowMock,
  startMicrophoneRecordingMock,
} = vi.hoisted(() => {
  const ensureModelLoaded = vi.fn().mockResolvedValue(undefined);
  const deleteModel = vi.fn().mockResolvedValue(undefined);
  const isModelDownloaded = vi.fn().mockResolvedValue(false);
  const transcribe = vi.fn().mockResolvedValue("hello world");
  return {
    ensureModelLoadedMock: ensureModelLoaded,
    deleteModelMock: deleteModel,
    isModelDownloadedMock: isModelDownloaded,
    transcribeMock: transcribe,
    voiceManagerMock: {
      ensureModelLoaded,
      deleteModel,
      isModelDownloaded,
      transcribe,
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

describe("VoiceInputButton", () => {
  beforeEach(() => {
    composerSetText.mockClear();
    ensureModelLoadedMock.mockClear();
    deleteModelMock.mockClear();
    isModelDownloadedMock.mockClear();
    isModelDownloadedMock.mockResolvedValue(false);
    transcribeMock.mockClear();
    notificationShowMock.mockClear();
    workspaceLocaleRef.current = "en";
    window.localStorage.clear();
    startMicrophoneRecordingMock.mockReset();
  });

  it("shows end recording and cancel controls while recording", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    startMicrophoneRecordingMock.mockResolvedValue({
      stop: vi.fn().mockResolvedValue(new Float32Array([0])),
    });
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    const micButton = await screen.findByRole("button", {
      name: /speak \(local voice-to-text\)/i,
    });
    await act(async () => {
      fireEvent.click(micButton);
    });

    expect(
      await screen.findByRole("button", { name: /end recording/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /^cancel$/i }),
    ).toBeInTheDocument();
  });

  it("discards audio when cancel is clicked during recording", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    const stopMock = vi.fn().mockResolvedValue(new Float32Array([0]));
    startMicrophoneRecordingMock.mockResolvedValue({
      stop: stopMock,
    });
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    const micButton = await screen.findByRole("button", {
      name: /speak \(local voice-to-text\)/i,
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
      screen.queryByRole("button", { name: /end recording/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a microphone button with a setup tooltip when no model is downloaded", async () => {
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
    ensureModelLoadedMock.mockImplementation(async () => {
      isModelDownloadedMock.mockResolvedValue(true);
    });
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

  it("does not render voice settings until a model is downloaded locally", async () => {
    isModelDownloadedMock.mockResolvedValue(false);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    await screen.findByRole("button", { name: /set up voice prompting/i });
    expect(
      screen.queryByRole("button", { name: /voice settings/i }),
    ).not.toBeInTheDocument();
  });

  it("renders voice settings after a model is present in the local cache", async () => {
    isModelDownloadedMock.mockResolvedValue(true);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    expect(
      await screen.findByRole("button", { name: /voice settings/i }),
    ).toBeInTheDocument();
  });

  it("defaults the language picker to the workspace locale when nothing is stored", async () => {
    workspaceLocaleRef.current = "es";
    isModelDownloadedMock.mockResolvedValue(true);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

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
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

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
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

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

  it("falls back to auto-detect when the workspace locale has no voice mapping", async () => {
    workspaceLocaleRef.current = "ar";
    isModelDownloadedMock.mockResolvedValue(true);
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

    const settingsButton = await screen.findByRole("button", {
      name: /voice settings/i,
    });
    await act(async () => {
      fireEvent.click(settingsButton);
    });

    const languageInput = await screen.findByRole("combobox", {
      name: /language/i,
    });
    expect((languageInput as HTMLInputElement).value).toBe("Auto-detect");
  });

  it("shows a remove control for each downloaded model in voice settings", async () => {
    isModelDownloadedMock.mockImplementation(async (id: string) => {
      return id === "whisper-tiny" || id === "whisper-base";
    });
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

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
    render(
      <AvandarUiProvider>
        <VoiceInputButton />
      </AvandarUiProvider>,
    );

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

    expect(deleteModelMock).toHaveBeenCalledWith("whisper-tiny");
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
