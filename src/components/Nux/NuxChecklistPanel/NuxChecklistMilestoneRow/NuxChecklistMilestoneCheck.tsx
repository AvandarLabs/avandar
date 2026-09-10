import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { ReactNode } from "react";

type Props = {
  milestoneKey: NuxProgress.MilestoneKey;
  isDone: boolean;
  label: string;
  onToggleDone: () => void;
};

/** Clickable completion circle for one Get started milestone. */
export function NuxChecklistMilestoneCheck({
  milestoneKey,
  isDone,
  label,
  onToggleDone,
}: Readonly<Props>): ReactNode {
  return (
    <Tooltip label={label} events={{ hover: true, focus: true, touch: false }}>
      <ActionIcon
        size="sm"
        radius="xl"
        variant={isDone ? "filled" : "light"}
        color={isDone ? "green" : "neutral"}
        aria-label={label}
        data-testid={`nux-milestone-check-${milestoneKey}`}
        onClick={onToggleDone}
      >
        {isDone ? <IconCheck size={12} /> : null}
      </ActionIcon>
    </Tooltip>
  );
}
