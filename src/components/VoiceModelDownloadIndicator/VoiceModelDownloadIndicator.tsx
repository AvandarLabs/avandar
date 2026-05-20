import { Loader, Progress, Text } from "@mantine/core";
import { Tooltip } from "@ui";
import { useVoiceModelStatus } from "@/lib/voice/useVoiceModelManager";
import { findVoiceModel } from "@/lib/voice/voiceModels";
import css from "./VoiceModelDownloadIndicator.module.css";

/**
 * Floating indicator anchored to the bottom-left of the viewport. Only
 * renders while a voice model is being downloaded. Hovering reveals a
 * tooltip with the same message the user sees as the title; the body shows
 * a determinate progress bar when transformers.js reports % progress, or
 * an indeterminate loader while waiting for the first progress event.
 */
export function VoiceModelDownloadIndicator(): JSX.Element | null {
  const status = useVoiceModelStatus();

  if (status.kind !== "downloading") {
    return null;
  }

  const model = findVoiceModel(status.modelId);
  const isDeterminate = status.progressPercent >= 0;
  const message = `Downloading ${model.displayName} for voice prompting`;
  const percentLabel =
    isDeterminate ? `${Math.round(status.progressPercent)}%` : "Starting…";

  return (
    <Tooltip label={message} position="top-start" openDelay={200}>
      <div
        className={css.root}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className={css.titleRow}>
          <p className={css.title}>{model.displayName}</p>
          <div className={css.spinnerWrapper}>
            {isDeterminate ?
              <Text size="xs" c="neutral.7" fw={600}>
                {percentLabel}
              </Text>
            : <Loader size="xs" />}
          </div>
        </div>
        <Progress
          value={isDeterminate ? status.progressPercent : 0}
          animated={!isDeterminate}
          striped={!isDeterminate}
          size="sm"
          radius="xl"
          color="primary"
        />
        <p className={css.subtitle}>
          {status.currentFile ?
            `Downloading ${status.currentFile}…`
          : "Preparing local voice model…"}
        </p>
      </div>
    </Tooltip>
  );
}
