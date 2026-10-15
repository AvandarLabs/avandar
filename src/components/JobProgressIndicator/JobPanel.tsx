import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Progress, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import css from "./JobProgressIndicator.module.css";
import type {
  JobEntry,
  JobId,
} from "@/lib/utils/state/JobProgressStore/JobProgressStore";

type Props = {
  id: JobId;
  entry: JobEntry;
};

/**
 * One floating panel for a single live job tracked by
 * {@link JobProgressStore}: an indeterminate or determinate progress bar, or
 * a dismissible error message.
 */
export function JobPanel({ id, entry }: Props): JSX.Element {
  const { t } = useLingui();

  return (
    <div
      className={css.jobProgressPanel}
      role={entry.status === "error" ? "alert" : "status"}
      aria-live={entry.status === "error" ? undefined : "polite"}
      aria-label={entry.label}
    >
      <div className={css.jobProgressTitleRow}>
        <Text size="sm" fw={600} className={css.jobProgressLabel}>
          {entry.label}
        </Text>
        {entry.status === "error" ? (
          <ActionIcon
            variant="subtle"
            size="sm"
            color="neutral"
            aria-label={t`Dismiss ${entry.label}`}
            onClick={() => {
              JobProgressStore.finishJob(id);
            }}
          >
            <IconX size={14} />
          </ActionIcon>
        ) : null}
      </div>

      {entry.status === "determinate" ? (
        <Progress
          value={entry.total > 0 ? (entry.current / entry.total) * 100 : 0}
          size="sm"
          radius="xl"
          color="primary"
        />
      ) : null}
      {entry.status === "indeterminate" ? (
        <Progress
          value={100}
          striped
          animated
          size="sm"
          radius="xl"
          color="primary"
        />
      ) : null}

      {entry.status !== "error" && entry.detail ? (
        <Text size="xs" className={css.jobProgressDetail}>
          {entry.detail}
        </Text>
      ) : null}
      {entry.status === "error" ? (
        <Text size="xs" className={css.jobProgressErrorMessage}>
          {entry.message}
        </Text>
      ) : null}
    </div>
  );
}
