import { useComposerRuntime } from "@assistant-ui/react";
import { useBoolean } from "@hooks";
import { Trans, useLingui } from "@lingui/react/macro";
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
  IconPlayerStop,
  IconSettings,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Tooltip } from "@ui";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";
import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { startMicrophoneRecording } from "@/lib/voice/audioCapture";
import { useDownloadedWhisperCppVoiceModels } from "@/lib/voiceWhisperCpp/useDownloadedWhisperCppVoiceModels";
import { useWhisperCppVoiceModelManager } from "@/lib/voiceWhisperCpp/useWhisperCppVoiceModelManager";
import {
  hasStoredVoiceLanguage,
  readStoredVoiceLanguage,
  VOICE_LANGUAGE_STORAGE_KEY,
  writeStoredVoiceLanguage,
} from "@/lib/voice/voiceLanguageStorage";
import {
  DEFAULT_VOICE_MODEL_ID,
  findVoiceModel,
  VOICE_LANGUAGES,
  VOICE_MODELS,
  voiceLanguageForLocale,
} from "@/lib/voice/voiceModels";
import css from "./VoiceInputButtonWhisperCpp.module.css";
import type { AudioRecorder } from "@/lib/voice/audioCapture";
import type { VoiceLanguageCode, VoiceModelId } from "@/lib/voice/voiceModels";

const MODEL_STORAGE_KEY = "avandar.voice.whisperCpp.modelId";

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
  const { t } = useLingui();
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
            <Trans>Selected</Trans>
          </Text>
        : null}
      </Group>
    );
  }
  return (
    <Tooltip
      label={t`These are too big for web and are only available on Avandar Desktop`}
      position="right"
      withinPortal
    >
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text size="sm" c="neutral.5">
          {option.label}
        </Text>
        <Text size="xs" c="neutral.6">
          <Trans>Desktop only</Trans>
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
 * Parallel whisper.cpp WASM + worker pipeline (compare with the transformers
 * mic beside it). Transcription runs off the main thread.
 */
export function VoiceInputButtonWhisperCpp({
  disabled = false,
}: Props): JSX.Element {
  const composerRuntime = useComposerRuntime();
  const manager = useWhisperCppVoiceModelManager();
  const platform = usePlatformInfo();
  const isDesktopPlatform = platform === "desktop";
  const workspace = useCurrentWorkspace();
  const { locale: workspaceLocale } = useWorkspaceLanguage(workspace.id);
  const { t } = useLingui();
  const workspaceVoiceLanguage = voiceLanguageForLocale(workspaceLocale);
  const [language, setLanguage] = useState<VoiceLanguageCode>(() => {
    return readStoredVoiceLanguage() ?? workspaceVoiceLanguage;
  });
  const [selectedModelId, setSelectedModelId] = useState<VoiceModelId>(() => {
    return readStoredModelId();
  });
  const {
    downloadedModelIds,
    hasAnyDownloaded: hasAnyModelDownloaded,
    isSelectedModelDownloaded: isModelReady,
    refresh: refreshDownloadState,
  } = useDownloadedWhisperCppVoiceModels({ selectedModelId });
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
        const { hasAnyDownloaded: anyDownloaded } =
          await refreshDownloadState();
        const model = findVoiceModel(modelId);
        notifications.show({
          title: t`Voice model removed`,
          message: t`${model.displayName} was deleted from this device.`,
          color: "success",
        });
        if (!anyDownloaded) {
          closeSettings();
        }
      } catch (error) {
        notifications.show({
          title: t`Could not remove voice model`,
          message:
            error instanceof Error ?
              error.message
            : t`Unable to delete the voice model from cache.`,
          color: "danger",
        });
      } finally {
        setDeletingModelId(null);
      }
    },
    [closeSettings, manager, refreshDownloadState, t],
  );

  const handleConfirmDownload = useCallback(
    async (options: { closeSettings: boolean } = { closeSettings: false }) => {
      setIsPromptOpen(false);
      if (options.closeSettings) {
        closeSettings();
      }
      try {
        await OfflineChatResourceManager.releaseForVoice();
        await manager.ensureModelLoaded(selectedModelId);
        await refreshDownloadState();
        const model = findVoiceModel(selectedModelId);
        notifications.show({
          title: t`Voice model ready`,
          message: t`${model.displayName} downloaded. Tap the mic to start dictating.`,
          color: "success",
        });
      } catch (error) {
        notifications.show({
          title: t`Voice model download failed`,
          message:
            error instanceof Error ?
              error.message
            : t`Unable to download the voice model.`,
          color: "danger",
        });
      }
    },
    [closeSettings, manager, refreshDownloadState, selectedModelId, t],
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
      await OfflineChatResourceManager.releaseForVoice();
      const recorder = await startMicrophoneRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      notifications.show({
        title: t`Microphone access denied`,
        message:
          error instanceof Error ?
            error.message
          : t`Could not access the microphone.`,
        color: "danger",
      });
    }
  }, [t]);

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
          title: t`No speech detected`,
          message: t`We didn't catch anything — try again a bit closer to the mic.`,
          color: "warning",
        });
      }
    } catch (error) {
      notifications.show({
        title: t`Transcription failed`,
        message:
          error instanceof Error ?
            error.message
          : t`Could not transcribe your audio.`,
        color: "danger",
      });
    } finally {
      setIsTranscribing(false);
      try {
        await manager.releaseLoadedPipeline();
      } catch {
        // Best-effort: free worker WASM heap for chat / DuckDB.
      }
    }
  }, [composerRuntime, language, manager, selectedModelId, t]);

  const cancelRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }
    recorderRef.current = null;
    setIsRecording(false);
    try {
      await recorder.stop();
    } catch {
      // Ignore decode/stop errors when discarding captured audio.
    }
  }, []);

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
    isRecording ? t`Stop and transcribe`
    : isTranscribing ? t`Transcribing…`
    : isModelReady ? t`Speak (whisper.cpp WASM)`
    : t`Set up whisper.cpp voice`;

  const RecordIcon = isRecording ? IconPlayerStop : IconMicrophone;
  const selectedModel = findVoiceModel(selectedModelId);
  const selectedLanguageLabel =
    VOICE_LANGUAGES.find((entry) => {
      return entry.code === language;
    })?.label ?? language;

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
              <Tooltip
                label={t`Whisper.cpp voice settings`}
                disabled={isSettingsOpen}
              >
                <ActionIcon
                  variant="subtle"
                  color="teal"
                  size="md"
                  aria-label={t`Whisper.cpp voice settings`}
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
                  <Trans>Whisper.cpp voice (WASM)</Trans>
                </Text>
                <Stack gap="xs">
                  <Select
                    label={t`Model`}
                    description={t`${selectedModel.description} (~${selectedModel.approxSizeMb} MB)`}
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
                        <Trans>Download</Trans>
                      </Button>
                    </Group>
                  : null}
                  {downloadedModelIds.length > 0 ?
                    <Stack gap={4}>
                      <Text size="xs" c="neutral.6">
                        <Trans>Downloaded on this device</Trans>
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
                            <Tooltip label={t`Remove ${model.displayName}`}>
                              <ActionIcon
                                variant="subtle"
                                color="neutral"
                                size="sm"
                                aria-label={t`Remove ${model.displayName}`}
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
                  label={t`Language`}
                  description={t`Used when transcribing; does not change the model download.`}
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
          <>
            <Tooltip label={t`Cancel`}>
              <ActionIcon
                variant="subtle"
                color="neutral"
                size="md"
                aria-label={t`Cancel`}
                className={css.button}
                onClick={() => {
                  void cancelRecording();
                }}
                disabled={disabled || isTranscribing}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
            <Text
              size="xs"
              c="neutral.6"
              className={css.languageIndicator}
              title={t`Transcription language: ${selectedLanguageLabel}`}
              aria-label={t`Transcription language: ${selectedLanguageLabel}`}
            >
              {selectedLanguageLabel}
            </Text>
          </>
        : null}

        <Tooltip label={tooltipLabel}>
          <ActionIcon
            variant={isRecording ? "filled" : "subtle"}
            color={isRecording ? "danger" : "teal"}
            size="md"
            aria-label={tooltipLabel}
            onClick={() => {
              void handleClick();
            }}
            disabled={micDisabled}
            loading={isTranscribing}
            className={clsx(css.button, isRecording && css.recording)}
          >
            <RecordIcon size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal
        opened={isPromptOpen}
        onClose={() => {
          setIsPromptOpen(false);
        }}
        title={t`Enable whisper.cpp voice`}
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              This mic uses whisper.cpp in WebAssembly (worker thread). We
              download a ggml model from Hugging Face once. Progress appears in
              the bottom-left corner.
            </Trans>
          </Text>

          <Select
            label={t`Model`}
            description={t`${selectedModel.description} (~${selectedModel.approxSizeMb} MB)`}
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
            label={t`Language`}
            description={t`Choose the language you will speak when dictating.`}
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
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="filled"
              color="primary"
              onClick={() => {
                void handleConfirmDownload();
              }}
            >
              <Trans>Download &amp; enable</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
