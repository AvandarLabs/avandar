import { Progress, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useVoiceModelStatus } from "@/lib/voice/useVoiceModelManager";
import { overallDownloadPercent } from "@/lib/voice/voiceDownloadProgress";
import { findVoiceModel } from "@/lib/voice/voiceModels";
import css from "./VoiceModelDownloadIndicator.module.css";
import type { VoiceDownloadFileEntry } from "@/lib/voice/voiceManagerInterface";

function VoiceDownloadFileRow({
  file,
}: {
  file: VoiceDownloadFileEntry;
}): JSX.Element {
  const isComplete = file.state === "complete";
  const label =
    isComplete ? "Complete"
    : file.progressPercent > 0 ? `${Math.round(file.progressPercent)}%`
    : "Waiting…";

  return (
    <div className={css.fileRow}>
      <div className={css.fileNameRow}>
        <Text size="xs" className={css.fileName} title={file.fileName}>
          {file.fileName}
        </Text>
        {isComplete ?
          <IconCheck size={14} className={css.completeIcon} aria-hidden />
        : <Text size="xs" c="neutral.6" fw={600}>
            {label}
          </Text>
        }
      </div>
      <Progress
        value={isComplete ? 100 : Math.max(0, file.progressPercent)}
        size="xs"
        radius="xl"
        color={isComplete ? "success" : "primary"}
        aria-label={`${file.fileName}: ${label}`}
      />
    </div>
  );
}

/**
 * Floating panel anchored to the bottom-left while a voice model is
 * downloading and loading. Each HF asset gets its own progress row;
 * completed rows stay visible until the model is ready.
 */
export function VoiceModelDownloadIndicator(): JSX.Element | null {
  const status = useVoiceModelStatus();

  if (status.kind !== "downloading") {
    return null;
  }

  const model = findVoiceModel(status.modelId);
  const message = `Downloading ${model.displayName} for voice prompting`;
  const overallPercent = overallDownloadPercent(status.files);
  const overallLabel = overallPercent >= 0 ? `${overallPercent}%` : "Starting…";

  return (
    <div
      className={css.root}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={css.titleRow}>
        <p className={css.title}>{model.displayName}</p>
        <Text size="xs" c="neutral.7" fw={600}>
          {overallLabel}
        </Text>
      </div>

      <Text size="xs" c="danger" fw={600} className={css.warning}>
        Do not refresh or close this tab — the download will be canceled.
      </Text>

      {status.files.length > 0 ?
        <Stack gap={6} className={css.fileList}>
          {status.files.map((file) => {
            return <VoiceDownloadFileRow key={file.fileName} file={file} />;
          })}
        </Stack>
      : <Text size="xs" c="neutral.6">
          Preparing download…
        </Text>
      }

      {status.phase === "loading" ?
        <Text size="xs" c="neutral.6" className={css.loadingNote}>
          Finishing setup — almost ready.
        </Text>
      : null}
    </div>
  );
}
