import { Progress, Text } from "@mantine/core";
import { Tooltip } from "@ui";
import { useVoiceModelStatus } from "@/lib/voice/useVoiceModelManager";
import { findVoiceModel } from "@/lib/voice/voiceModels";
import css from "./VoiceModelDownloadIndicator.module.css";

/**
 * Floating indicator anchored to the bottom-left of the viewport. Only
 * renders while a voice model is being downloaded. Hovering reveals a
 * tooltip with the same message the user sees as the title; the body shows
 * a single determinate progress bar (0% until the first byte-count arrives).
 */
export function VoiceModelDownloadIndicator(): JSX.Element | null {
  const status = useVoiceModelStatus();

  if (status.kind !== "downloading") {
    return null;
  }

  const model = findVoiceModel(status.modelId);
  const message = `Downloading ${model.displayName} for voice prompting`;
  const hasPercent = status.progressPercent >= 0;
  const barValue = hasPercent ? status.progressPercent : 0;
  const percentLabel =
    hasPercent ? `${Math.round(status.progressPercent)}%` : "Starting…";

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
            <Text size="xs" c="neutral.7" fw={600}>
              {percentLabel}
            </Text>
          </div>
        </div>
        <Progress
          value={barValue}
          size="sm"
          radius="xl"
          color="primary"
          aria-label={percentLabel}
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
