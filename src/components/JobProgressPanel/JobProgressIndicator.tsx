import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Progress, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { match } from "ts-pattern";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import css from "./JobProgressPanel.module.css";
import type {
  JobEntry,
  JobId,
} from "@/lib/utils/state/JobProgressStore/JobProgressStore";

type Props = {
  id: JobId;
  entry: JobEntry;
};

/**
 * One indicator for a single live job tracked by {@link JobProgressStore}: an
 * indeterminate or determinate progress bar, or a dismissible error message.
 */
export function JobProgressIndicator({ id, entry }: Props): JSX.Element {
  const { t } = useLingui();

  const { role, ariaLive, showDismissButton, body } = match(entry)
    .with({ status: "indeterminate" }, (indeterminateEntry) => {
      return {
        role: "status" as const,
        ariaLive: "polite" as const,
        showDismissButton: false,
        body: (
          <>
            <Progress
              value={100}
              striped
              animated
              size="sm"
              radius="xl"
              color="primary"
            />
            {indeterminateEntry.detail ? (
              <Text size="xs" className={css.jobProgressDetail}>
                {indeterminateEntry.detail}
              </Text>
            ) : null}
          </>
        ),
      };
    })
    .with({ status: "determinate" }, (determinateEntry) => {
      return {
        role: "status" as const,
        ariaLive: "polite" as const,
        showDismissButton: false,
        body: (
          <>
            <Progress
              value={
                determinateEntry.total > 0
                  ? (determinateEntry.current / determinateEntry.total) * 100
                  : 0
              }
              size="sm"
              radius="xl"
              color="primary"
            />
            {determinateEntry.detail ? (
              <Text size="xs" className={css.jobProgressDetail}>
                {determinateEntry.detail}
              </Text>
            ) : null}
          </>
        ),
      };
    })
    .with({ status: "error" }, (errorEntry) => {
      return {
        role: "alert" as const,
        ariaLive: undefined,
        showDismissButton: true,
        body: (
          <Text size="xs" className={css.jobProgressErrorMessage}>
            {errorEntry.message}
          </Text>
        ),
      };
    })
    .exhaustive();

  return (
    <div
      className={css.jobProgressIndicator}
      role={role}
      aria-live={ariaLive}
      aria-label={entry.label}
    >
      <div className={css.jobProgressTitleRow}>
        <Text size="sm" fw={600} className={css.jobProgressLabel}>
          {entry.label}
        </Text>
        {showDismissButton ? (
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

      {body}
    </div>
  );
}
