import { useComposerRuntime } from "@assistant-ui/react";
import { useBoolean } from "@hooks";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Popover,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { Tooltip } from "@ui";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";
import { isOfflineChatEnabled } from "@/lib/offlineChat/isOfflineChatEnabled";
import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { startMicrophoneRecording } from "@/lib/voice/audioCapture";
import { useVoiceModelManager } from "@/lib/voice/useVoiceModelManager";
import {
  hasStoredVoiceLanguage,
  readStoredVoiceLanguage,
  VOICE_LANGUAGE_STORAGE_KEY,
  writeStoredVoiceLanguage,
} from "@/lib/voice/voiceLanguageStorage";
import {
  DEFAULT_VOICE_MODEL_ID,
  findVoiceModel,
  listModelsForPlatform,
  VOICE_LANGUAGES,
  VOICE_MODELS,
  voiceLanguageForLocale,
} from "@/lib/voice/voiceModels";
import css from "./VoiceInputButton.module.css";
import type { AudioRecorder } from "@/lib/voice/audioCapture";
import type { VoiceLanguageCode, VoiceModelId } from "@/lib/voice/voiceModels";

const MODEL_STORAGE_KEY = "avandar.voice.modelId";

function readStoredModelId(): VoiceModelId {
  try {
    const raw = window.localStorage.getItem(MODEL_STORAGE_KEY);
    const matched = VOICE_MODELS.find((model) => {
      return model.id === raw;
    });
    return matched?.id ?? DEFAULT_VOICE_MODEL_ID;
  } catch {
    return DEFAULT_VOICE_MODEL_ID;
  }
}

type Props = {
  disabled?: boolean;
};

type VoiceModelSelectOptionProps = {
  option: { value: string; label: string; disabled?: boolean };
  checked?: boolean;
  isDesktopPlatform: boolean;
};

function VoiceModelSelectOption({
  option,
  checked,
  isDesktopPlatform,
}: VoiceModelSelectOptionProps): JSX.Element {
  const model = VOICE_MODELS.find((entry) => {
    return entry.id === option.value;
  });
  const disabledForWeb = model?.desktopOnly === true && !isDesktopPlatform;
  if (!disabledForWeb) {
    return (
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text size="sm">{option.label}</Text>
        {checked ?
          <Text size="xs" c="primary">
            Selected
          </Text>
        : null}
      </Group>
    );
  }
  return (
    <Tooltip
      label="These are too big for web and are only available on Avandar Desktop"
      position="right"
      withinPortal
    >
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text size="sm" c="neutral.5">
          {option.label}
        </Text>
        <Text size="xs" c="neutral.6">
          Desktop only
        </Text>
      </Group>
    </Tooltip>
  );
}

/**
 * Microphone button rendered in the chat composer. Tapping it either:
 *   1. Opens a confirmation modal if no voice model has been downloaded
 *      yet (so the user explicitly opts into the large download), or
 *   2. Starts microphone capture immediately if a model is available.
 *
 * When recording stops, the audio is transcribed locally via the
 * `VoiceModelManager` singleton and the result is pushed into the
 * composer through `useComposerRuntime().setText`.
 */
export function VoiceInputButton({ disabled = false }: Props): JSX.Element {
  const composerRuntime = useComposerRuntime();
  const manager = useVoiceModelManager();
  const platform = usePlatformInfo();
  const isDesktopPlatform = platform === "desktop";
  const workspace = useCurrentWorkspace();
  const { locale: workspaceLocale } = useWorkspaceLanguage(workspace.id);
  const workspaceVoiceLanguage = voiceLanguageForLocale(workspaceLocale);
  const [language, setLanguage] = useState<VoiceLanguageCode>(() => {
    return readStoredVoiceLanguage() ?? workspaceVoiceLanguage;
  });
  const [selectedModelId, setSelectedModelId] = useState<VoiceModelId>(() => {
    return readStoredModelId();
  });
  const [isModelReady, setIsModelReady] = useState(false);
  const [hasAnyModelDownloaded, setHasAnyModelDownloaded] = useState(false);
  const [downloadedModelIds, setDownloadedModelIds] = useState<
    readonly VoiceModelId[]
  >([]);
  const [deletingModelId, setDeletingModelId] = useState<VoiceModelId | null>(
    null,
  );
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSettingsOpen, , closeSettings, toggleSettings] = useBoolean(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);

  // If a previous desktop session picked a desktop-only model, drop back
  // to the default once the web build loads — the user can't run it here.
  useEffect(() => {
    if (isDesktopPlatform) {
      return;
    }
    const current = findVoiceModel(selectedModelId);
    if (current.desktopOnly) {
      setSelectedModelId(DEFAULT_VOICE_MODEL_ID);
    }
  }, [isDesktopPlatform, selectedModelId]);

  const voicePlatform = isDesktopPlatform ? "desktop" : "web";

  const refreshDownloadState = useCallback(async () => {
    const platformModels = listModelsForPlatform(voicePlatform);
    const downloadChecks = await Promise.all(
      platformModels.map(async (model) => {
        const downloaded = await manager.isModelDownloaded(model.id);
        return { id: model.id, downloaded };
      }),
    );
    const downloadedIds = downloadChecks
      .filter((check) => {
        return check.downloaded;
      })
      .map((check) => {
        return check.id;
      });
    setDownloadedModelIds(downloadedIds);
    const anyDownloaded = downloadedIds.length > 0;
    setHasAnyModelDownloaded(anyDownloaded);
    const selectedReady = downloadedIds.includes(selectedModelId);
    setIsModelReady(selectedReady);
    return { anyDownloaded, selectedReady, downloadedIds };
  }, [manager, selectedModelId, voicePlatform]);

  // Re-check local cache (IndexedDB on web, on-disk on desktop) whenever the
  // selected model changes or after a successful download.
  useEffect(() => {
    let cancelled = false;
    void refreshDownloadState().then(() => {
      if (cancelled) {
        return undefined;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshDownloadState]);

  // Follow workspace locale only until the user picks a voice language in
  // settings (stored in localStorage, shared across tabs).
  useEffect(() => {
    if (hasStoredVoiceLanguage()) {
      return;
    }
    setLanguage(workspaceVoiceLanguage);
  }, [workspaceVoiceLanguage]);

  const handleVoiceLanguageChange = useCallback((value: string | null) => {
    if (!value) {
      return;
    }
    const code = value as VoiceLanguageCode;
    setLanguage(code);
    writeStoredVoiceLanguage(code);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== VOICE_LANGUAGE_STORAGE_KEY) {
        return;
      }
      const stored = readStoredVoiceLanguage();
      if (stored) {
        setLanguage(stored);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, selectedModelId);
    } catch {
      // Ignore.
    }
  }, [selectedModelId]);

  const voiceSelectComboboxProps = { withinPortal: true } as const;

  const handleDeleteModel = useCallback(
    async (modelId: VoiceModelId) => {
      setDeletingModelId(modelId);
      try {
        await manager.deleteModel(modelId);
        const { anyDownloaded } = await refreshDownloadState();
        const model = findVoiceModel(modelId);
        notifications.show({
          title: "Voice model removed",
          message: `${model.displayName} was deleted from this device.`,
          color: "success",
        });
        if (!anyDownloaded) {
          closeSettings();
        }
      } catch (error) {
        notifications.show({
          title: "Could not remove voice model",
          message:
            error instanceof Error ?
              error.message
            : "Unable to delete the voice model from cache.",
          color: "danger",
        });
      } finally {
        setDeletingModelId(null);
      }
    },
    [closeSettings, manager, refreshDownloadState],
  );

  const handleConfirmDownload = useCallback(
    async (options: { closeSettings: boolean } = { closeSettings: false }) => {
      setIsPromptOpen(false);
      if (options.closeSettings) {
        closeSettings();
      }
      try {
        if (isOfflineChatEnabled()) {
          await OfflineChatResourceManager.releaseForVoice();
        }
        await manager.ensureModelLoaded(selectedModelId);
        await refreshDownloadState();
        const model = findVoiceModel(selectedModelId);
        notifications.show({
          title: "Voice model ready",
          message: `${model.displayName} downloaded. Tap the mic to start dictating.`,
          color: "success",
        });
      } catch (error) {
        notifications.show({
          title: "Voice model download failed",
          message:
            error instanceof Error ?
              error.message
            : "Unable to download the voice model.",
          color: "danger",
        });
      }
    },
    [closeSettings, manager, refreshDownloadState, selectedModelId],
  );

  const modelSelectData = VOICE_MODELS.map((model) => {
    return {
      value: model.id,
      label: `${model.displayName} (~${model.approxSizeMb} MB)`,
      disabled: model.desktopOnly && !isDesktopPlatform,
    };
  });

  const languageSelectData = VOICE_LANGUAGES.map((lang) => {
    return { value: lang.code, label: lang.label };
  });

  const startRecording = useCallback(async () => {
    try {
      if (isOfflineChatEnabled()) {
        await OfflineChatResourceManager.releaseForVoice();
      }
      const recorder = await startMicrophoneRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      notifications.show({
        title: "Microphone access denied",
        message:
          error instanceof Error ?
            error.message
          : "Could not access the microphone.",
        color: "danger",
      });
    }
  }, []);

  const stopRecordingAndTranscribe = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }
    recorderRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const audio = await recorder.stop();
      const text = await manager.transcribe(audio, {
        modelId: selectedModelId,
        language,
      });
      if (text.length > 0) {
        const previous = composerRuntime.getState().text;
        const joined = previous ? `${previous.trim()} ${text}`.trim() : text;
        composerRuntime.setText(joined);
      } else {
        notifications.show({
          title: "No speech detected",
          message:
            "We didn't catch anything — try again a bit closer to the mic.",
          color: "warning",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Transcription failed",
        message:
          error instanceof Error ?
            error.message
          : "Could not transcribe your audio.",
        color: "danger",
      });
    } finally {
      setIsTranscribing(false);
    }
  }, [composerRuntime, language, manager, selectedModelId]);

  const handleClick = useCallback(async () => {
    if (isRecording) {
      await stopRecordingAndTranscribe();
      return;
    }
    if (!isModelReady) {
      setIsPromptOpen(true);
      return;
    }
    await startRecording();
  }, [isModelReady, isRecording, startRecording, stopRecordingAndTranscribe]);

  const tooltipLabel =
    isRecording ? "Stop and transcribe"
    : isTranscribing ? "Transcribing…"
    : isModelReady ? "Speak (local voice-to-text)"
    : "Set up voice prompting";

  const Icon = isRecording ? IconMicrophoneOff : IconMicrophone;
  const selectedModel = findVoiceModel(selectedModelId);

  const settingsDisabled = disabled || isTranscribing || isRecording;
  const micDisabled = disabled || isTranscribing;

  return (
    <>
      <Group gap={4} wrap="nowrap" className={css.controls}>
        {hasAnyModelDownloaded ?
          <Popover
            opened={isSettingsOpen}
            onChange={(opened) => {
              if (!opened) {
                closeSettings();
              }
            }}
            onDismiss={closeSettings}
            position="top-end"
            width={300}
            withinPortal
            trapFocus={false}
            shadow="md"
          >
            <Popover.Target>
              <Tooltip label="Voice settings" disabled={isSettingsOpen}>
                <ActionIcon
                  variant="subtle"
                  color="neutral"
                  size="md"
                  aria-label="Voice settings"
                  onClick={toggleSettings}
                  disabled={settingsDisabled}
                  className={css.button}
                >
                  <IconSettings size={16} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown
              p="sm"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <Stack gap="sm">
                <Text size="sm" fw={500}>
                  Voice prompting
                </Text>
                <Stack gap="xs">
                  <Select
                    label="Model"
                    description={`${selectedModel.description} (~${selectedModel.approxSizeMb} MB)`}
                    value={selectedModelId}
                    onChange={(value) => {
                      if (value) {
                        setSelectedModelId(value as VoiceModelId);
                      }
                    }}
                    data={modelSelectData}
                    comboboxProps={voiceSelectComboboxProps}
                    renderOption={({ option, checked }) => {
                      return (
                        <VoiceModelSelectOption
                          option={option}
                          checked={checked}
                          isDesktopPlatform={isDesktopPlatform}
                        />
                      );
                    }}
                  />
                  {!isModelReady ?
                    <Group justify="flex-end">
                      <Button
                        variant="light"
                        color="primary"
                        size="compact-sm"
                        onClick={() => {
                          void handleConfirmDownload();
                        }}
                      >
                        Download
                      </Button>
                    </Group>
                  : null}
                  {downloadedModelIds.length > 0 ?
                    <Stack gap={4}>
                      <Text size="xs" c="neutral.6">
                        Downloaded on this device
                      </Text>
                      {downloadedModelIds.map((modelId) => {
                        const model = findVoiceModel(modelId);
                        const isDeleting = deletingModelId === modelId;
                        return (
                          <Group
                            key={modelId}
                            justify="space-between"
                            wrap="nowrap"
                            className={css.downloadedModelRow}
                          >
                            <Text size="sm" truncate>
                              {model.displayName}
                            </Text>
                            <Tooltip label={`Remove ${model.displayName}`}>
                              <ActionIcon
                                variant="subtle"
                                color="neutral"
                                size="sm"
                                aria-label={`Remove ${model.displayName}`}
                                loading={isDeleting}
                                disabled={
                                  settingsDisabled || deletingModelId !== null
                                }
                                onClick={() => {
                                  void handleDeleteModel(modelId);
                                }}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        );
                      })}
                    </Stack>
                  : null}
                </Stack>
                <Select
                  label="Language"
                  description="Used when transcribing; does not change the model download."
                  value={language}
                  onChange={handleVoiceLanguageChange}
                  data={languageSelectData}
                  comboboxProps={voiceSelectComboboxProps}
                />
              </Stack>
            </Popover.Dropdown>
          </Popover>
        : null}

        {isRecording ?
          <Button
            variant="light"
            color="danger"
            size="compact-sm"
            aria-label="End transcription"
            className={css.endTranscription}
            onClick={() => {
              void stopRecordingAndTranscribe();
            }}
            disabled={disabled || isTranscribing}
          >
            End transcription
          </Button>
        : null}

        <Tooltip label={tooltipLabel}>
          <ActionIcon
            variant={isRecording ? "filled" : "subtle"}
            color={isRecording ? "danger" : "neutral"}
            size="md"
            aria-label={tooltipLabel}
            onClick={() => {
              void handleClick();
            }}
            disabled={micDisabled}
            loading={isTranscribing}
            className={clsx(css.button, isRecording && css.recording)}
          >
            <Icon size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal
        opened={isPromptOpen}
        onClose={() => {
          setIsPromptOpen(false);
        }}
        title="Enable voice prompting"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Voice prompts run entirely on your device. To dictate, we need to
            download a Whisper model from Hugging Face once. The download runs
            in the background; progress appears in the bottom-left corner.
          </Text>

          <Select
            label="Model"
            description={`${selectedModel.description} (~${selectedModel.approxSizeMb} MB)`}
            value={selectedModelId}
            onChange={(value) => {
              if (value) {
                setSelectedModelId(value as VoiceModelId);
              }
            }}
            data={modelSelectData}
            comboboxProps={{ withinPortal: true }}
            renderOption={({ option, checked }) => {
              return (
                <VoiceModelSelectOption
                  option={option}
                  checked={checked}
                  isDesktopPlatform={isDesktopPlatform}
                />
              );
            }}
          />

          <Select
            label="Language"
            description="Whisper supports many languages; auto-detect handles mixed input."
            value={language}
            onChange={handleVoiceLanguageChange}
            data={languageSelectData}
            comboboxProps={{ withinPortal: true }}
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                setIsPromptOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="primary"
              onClick={() => {
                void handleConfirmDownload();
              }}
            >
              Download &amp; enable
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
