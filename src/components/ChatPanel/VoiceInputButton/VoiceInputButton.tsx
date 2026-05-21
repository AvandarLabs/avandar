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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";
import {
  formatModelSelectDescription,
  formatModelSelectLabel,
} from "@/lib/localModels/formatModelPickerCopy";
import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { startMicrophoneRecording } from "@/lib/voice/audioCapture";
import { useDownloadedVoiceModels } from "@/lib/voice/useDownloadedVoiceModels";
import { useVoiceModelManager } from "@/lib/voice/useVoiceModelManager";
import {
  VOICE_LANGUAGES,
  voiceLanguageForLocale,
} from "@/lib/voice/voiceLanguages";
import {
  hasStoredVoiceLanguage,
  readStoredVoiceLanguage,
  VOICE_LANGUAGE_STORAGE_KEY,
  writeStoredVoiceLanguage,
} from "@/lib/voice/voiceLanguageStorage";
import {
  DEFAULT_WHISPER_CPP_VOICE_MODEL_ID,
  findWhisperCppVoiceModel,
  isWhisperCppModelAvailableOnPlatform,
  isWhisperCppVoiceModelId,
  listWhisperCppVoiceModelsSorted,
  whisperCppApproxDownloadSizeMb,
} from "@/lib/voice/whisperCppVoiceModels";
import css from "./VoiceInputButton.module.css";
import type { AudioRecorder } from "@/lib/voice/audioCapture";
import type { VoiceLanguageCode } from "@/lib/voice/voiceLanguages";
import type { WhisperCppVoiceModelId } from "@/lib/voice/whisperCppVoiceModels";

const MODEL_STORAGE_KEY = "avandar.voice.modelId";
const LEGACY_MODEL_STORAGE_KEY = "avandar.voice.whisperCpp.modelId";

function readStoredModelId(): WhisperCppVoiceModelId {
  try {
    const raw =
      window.localStorage.getItem(MODEL_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_MODEL_STORAGE_KEY);
    if (raw && isWhisperCppVoiceModelId(raw)) {
      return raw;
    }
    return DEFAULT_WHISPER_CPP_VOICE_MODEL_ID;
  } catch {
    return DEFAULT_WHISPER_CPP_VOICE_MODEL_ID;
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
  const model = listWhisperCppVoiceModelsSorted(
    isDesktopPlatform ? "desktop" : "web",
  ).find((entry) => {
    return entry.id === option.value;
  });
  if (!model) {
    return (
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text size="sm">{option.label}</Text>
      </Group>
    );
  }
  const voicePlatform = isDesktopPlatform ? "desktop" : "web";
  const unavailableOnPlatform = !isWhisperCppModelAvailableOnPlatform(
    model,
    voicePlatform,
  );
  if (!unavailableOnPlatform) {
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
  const sizeMb = whisperCppApproxDownloadSizeMb(model, voicePlatform);
  return (
    <Tooltip
      label={t`Not available in the browser (${model.systemRequirements}, ~${sizeMb} MB download).`}
      position="right"
      withinPortal
    >
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text size="sm" c="neutral.5">
          {option.label}
        </Text>
        <Text size="xs" c="neutral.6">
          <Trans>Browser unavailable</Trans>
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
 * Local whisper.cpp dictation (WASM on web, native on Desktop).
 */
export function VoiceInputButton({ disabled = false }: Props): JSX.Element {
  const composerRuntime = useComposerRuntime();
  const manager = useVoiceModelManager();
  const platform = usePlatformInfo();
  const isDesktopPlatform = platform === "desktop";
  const workspace = useCurrentWorkspace();
  const { locale: workspaceLocale } = useWorkspaceLanguage(workspace.id);
  const { t } = useLingui();
  const workspaceVoiceLanguage = voiceLanguageForLocale(workspaceLocale);
  const [language, setLanguage] = useState<VoiceLanguageCode>(() => {
    return readStoredVoiceLanguage() ?? workspaceVoiceLanguage;
  });
  const [selectedModelId, setSelectedModelId] =
    useState<WhisperCppVoiceModelId>(() => {
      return readStoredModelId();
    });
  const [deletingModelId, setDeletingModelId] =
    useState<WhisperCppVoiceModelId | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSettingsOpen, , closeSettings, toggleSettings] = useBoolean(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const transcribeInFlightRef = useRef(false);

  const whisperCppPlatform = isDesktopPlatform ? "desktop" : "web";

  // Avoid binding Select to a model this runtime cannot load (prevents
  // onChange loops).
  const activeModelId = useMemo((): WhisperCppVoiceModelId => {
    const current = findWhisperCppVoiceModel(selectedModelId);
    if (isWhisperCppModelAvailableOnPlatform(current, whisperCppPlatform)) {
      return selectedModelId;
    }
    return DEFAULT_WHISPER_CPP_VOICE_MODEL_ID;
  }, [selectedModelId, whisperCppPlatform]);

  const {
    downloadedModelIds,
    hasAnyDownloaded: hasAnyModelDownloaded,
    isSelectedModelDownloaded: isModelReady,
    refresh: refreshDownloadState,
  } = useDownloadedVoiceModels({ selectedModelId: activeModelId });

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
      window.localStorage.setItem(MODEL_STORAGE_KEY, activeModelId);
    } catch {
      // Ignore.
    }
  }, [activeModelId]);

  const voiceSelectComboboxProps = { withinPortal: true } as const;

  const handleDeleteModel = useCallback(
    async (modelId: WhisperCppVoiceModelId) => {
      setDeletingModelId(modelId);
      try {
        await manager.deleteModel(modelId);
        const { hasAnyDownloaded: anyDownloaded } =
          await refreshDownloadState();
        const model = findWhisperCppVoiceModel(modelId);
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
      const modelToDownload = findWhisperCppVoiceModel(activeModelId);
      if (
        !isWhisperCppModelAvailableOnPlatform(
          modelToDownload,
          whisperCppPlatform,
        )
      ) {
        notifications.show({
          title: t`Voice model not available`,
          message: t`${modelToDownload.displayName} needs ${modelToDownload.systemRequirements} and is not available in the browser. Pick Tiny or Base here, or use a smaller RAM tier.`,
          color: "warning",
        });
        return;
      }
      try {
        await manager.ensureModelDownloaded(activeModelId);
        await refreshDownloadState();
        const model = findWhisperCppVoiceModel(activeModelId);
        notifications.show({
          title: t`Voice model saved`,
          message: t`${model.displayName} is on this device. Tap the mic to dictate.`,
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
    [
      closeSettings,
      manager,
      refreshDownloadState,
      activeModelId,
      t,
      whisperCppPlatform,
    ],
  );

  const modelSelectData = listWhisperCppVoiceModelsSorted(
    whisperCppPlatform,
  ).map((model) => {
    const sizeMb = whisperCppApproxDownloadSizeMb(model, whisperCppPlatform);
    return {
      value: model.id,
      label: formatModelSelectLabel({
        displayName: model.displayName,
        systemRequirements: model.systemRequirements,
        approxSizeMb: sizeMb,
      }),
      disabled: !isWhisperCppModelAvailableOnPlatform(
        model,
        whisperCppPlatform,
      ),
    };
  });

  const languageSelectData = VOICE_LANGUAGES.map((lang) => {
    return { value: lang.code, label: lang.label };
  });

  const startRecording = useCallback(async () => {
    try {
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
    if (transcribeInFlightRef.current) {
      return;
    }
    const recorder = recorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }
    transcribeInFlightRef.current = true;
    recorderRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const audio = await recorder.stop();
      await OfflineChatResourceManager.releaseForVoice();
      const text = await manager.transcribe(audio, {
        modelId: activeModelId,
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
      const failureMessage =
        error instanceof Error ? error.message
        : typeof error === "string" ? error
        : t`Could not transcribe your audio.`;
      notifications.show({
        title: t`Transcription failed`,
        message: failureMessage,
        color: "danger",
      });
      try {
        await manager.releaseLoadedPipeline();
      } catch {
        // Best-effort: free WASM after a failed turn.
      }
    } finally {
      transcribeInFlightRef.current = false;
      setIsTranscribing(false);
    }
  }, [activeModelId, composerRuntime, language, manager, t]);

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
    : isModelReady ? t`Speak`
    : t`Set up voice prompting`;

  const RecordIcon = isRecording ? IconPlayerStop : IconMicrophone;
  const selectedModel = findWhisperCppVoiceModel(activeModelId);
  const selectedModelSizeMb = whisperCppApproxDownloadSizeMb(
    selectedModel,
    whisperCppPlatform,
  );
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
              <Tooltip label={t`Voice settings`} disabled={isSettingsOpen}>
                <ActionIcon
                  variant="subtle"
                  color="neutral"
                  size="md"
                  aria-label={t`Voice settings`}
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
                  <Trans>Voice prompting</Trans>
                </Text>
                <Stack gap="xs">
                  <Select
                    label={t`Model`}
                    description={formatModelSelectDescription({
                      description: selectedModel.description,
                      recommendedIf: selectedModel.recommendedIf,
                      approxSizeMb: selectedModelSizeMb,
                    })}
                    value={activeModelId}
                    onChange={(value) => {
                      if (value) {
                        setSelectedModelId(value as WhisperCppVoiceModelId);
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
                        const model = findWhisperCppVoiceModel(modelId);
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
            <RecordIcon size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal
        opened={isPromptOpen}
        onClose={() => {
          setIsPromptOpen(false);
        }}
        title={t`Enable voice prompting`}
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              Dictation runs locally with whisper.cpp. We download a ggml model
              into device storage first (without freezing the tab). The model
              loads when you dictate. Progress appears bottom-left.
            </Trans>
          </Text>

          <Select
            label={t`Model`}
            description={formatModelSelectDescription({
              description: selectedModel.description,
              recommendedIf: selectedModel.recommendedIf,
              approxSizeMb: selectedModelSizeMb,
            })}
            value={activeModelId}
            onChange={(value) => {
              if (value) {
                setSelectedModelId(value as WhisperCppVoiceModelId);
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
              <Trans>Download</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
