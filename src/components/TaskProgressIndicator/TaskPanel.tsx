import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Progress, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
import css from "./TaskProgressIndicator.module.css";
import type { TaskEntry, TaskId } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";

type Props = {
  id: TaskId;
  entry: TaskEntry;
};

/**
 * One floating panel for a single live task tracked by
 * {@link TaskProgressStore}: an indeterminate or determinate progress bar, or
 * a dismissible error message.
 */
export function TaskPanel({ id, entry }: Props): JSX.Element {
  const { t } = useLingui();

  return (
    <div
      className={css.taskProgressPanel}
      role={entry.status === "error" ? "alert" : "status"}
      aria-live={entry.status === "error" ? undefined : "polite"}
      aria-label={entry.label}
    >
      <div className={css.taskProgressTitleRow}>
        <Text size="sm" fw={600} className={css.taskProgressLabel}>
          {entry.label}
        </Text>
        {entry.status === "error" ? (
          <ActionIcon
            variant="subtle"
            size="sm"
            color="neutral"
            aria-label={t`Dismiss ${entry.label}`}
            onClick={() => {
              TaskProgressStore.finishTask(id);
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
        <Text size="xs" className={css.taskProgressDetail}>
          {entry.detail}
        </Text>
      ) : null}
      {entry.status === "error" ? (
        <Text size="xs" className={css.taskProgressErrorMessage}>
          {entry.message}
        </Text>
      ) : null}
    </div>
  );
}
