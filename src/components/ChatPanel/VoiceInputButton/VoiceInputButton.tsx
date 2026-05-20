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
} from "@tabler/icons-react";
import { Tooltip } from "@ui";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";
import { startMicrophoneRecording } from "@/lib/voice/audioCapture";
import { useVoiceModelManager } from "@/lib/voice/useVoiceModelManager";
import {
  DEFAULT_VOICE_MODEL_ID,
  findVoiceModel,
  voiceLanguageForLocale,
  VOICE_LANGUAGES,
  VOICE_MODELS,
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
  const [language, setLanguage] = useState<VoiceLanguageCode>(
    workspaceVoiceLanguage,
  );
  const [selectedModelId, setSelectedModelId] = useState<VoiceModelId>(() => {
    return readStoredModelId();
  });
  const [isModelReady, setIsModelReady] = useState(false);
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

  // Whenever the selected model changes, re-check whether we already have it
  // cached locally so we can skip the download prompt next time.
  useEffect(() => {
    let cancelled = false;
    void manager.isModelDownloaded(selectedModelId).then((ready) => {
      if (!cancelled) {
        setIsModelReady(ready);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [manager, selectedModelId]);

  // Track the workspace language so the picker default follows changes
  // made from the workspace settings page. The user's per-session override
  // (e.g. "Auto-detect" for a noisy clip) is intentionally not persisted —
  // the workspace setting is the source of truth.
  useEffect(() => {
    setLanguage(workspaceVoiceLanguage);
  }, [workspaceVoiceLanguage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, selectedModelId);
    } catch {
      // Ignore.
    }
  }, [selectedModelId]);

  const handleConfirmDownload = useCallback(async () => {
    setIsPromptOpen(false);
    closeSettings();
    try {
      await manager.ensureModelLoaded(selectedModelId);
      setIsModelReady(true);
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
  }, [closeSettings, manager, selectedModelId]);

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

  const controlsDisabled = disabled || isTranscribing || isRecording;

  return (
    <>
      <Group gap={4} wrap="nowrap" className={css.controls}>
        <Popover
          opened={isSettingsOpen}
          onChange={toggleSettings}
          onDismiss={closeSettings}
          position="top-end"
          width={300}
          withinPortal
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
                disabled={controlsDisabled}
                className={css.button}
              >
                <IconSettings size={16} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="sm">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Voice prompting
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
                description="Used when transcribing; does not change the model download."
                value={language}
                onChange={(value) => {
                  if (value) {
                    setLanguage(value as VoiceLanguageCode);
                  }
                }}
                data={languageSelectData}
                comboboxProps={{ withinPortal: true }}
              />
              {isModelReady ?
                <Text size="xs" c="neutral.6">
                  {selectedModel.displayName} is ready on this device.
                </Text>
              : <Button
                  variant="light"
                  color="primary"
                  size="compact-sm"
                  onClick={() => {
                    void handleConfirmDownload();
                  }}
                >
                  Download &amp; enable
                </Button>
              }
            </Stack>
          </Popover.Dropdown>
        </Popover>

        <Tooltip label={tooltipLabel}>
          <ActionIcon
            variant={isRecording ? "filled" : "subtle"}
            color={isRecording ? "danger" : "neutral"}
            size="md"
            aria-label={tooltipLabel}
            onClick={() => {
              void handleClick();
            }}
            disabled={controlsDisabled}
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
            download {selectedModel.displayName} (~{selectedModel.approxSizeMb}{" "}
            MB) from Hugging Face once. Adjust the model or language anytime from
            the gear icon next to the microphone. The download runs in the
            background; progress appears in the bottom-left corner.
          </Text>

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
