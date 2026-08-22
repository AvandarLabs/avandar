import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import clsx from "clsx";

import { NuxChecklistMilestoneCheck } from "@/components/Nux/NuxChecklistPanel/NuxChecklistMilestoneRow/NuxChecklistMilestoneCheck";
import classes from "@/components/Nux/NuxChecklistPanel/NuxChecklistMilestoneRow/NuxChecklistMilestoneRow.module.css";

type Props = {
  milestone: NuxMilestone;
  isDone: boolean;
  isLocked: boolean;
  lockedTooltip?: string;
  onOpen: () => void;
  onToggleDone: () => void;
};

/**
 * One Get started row: the circle toggles done, the rest of the row starts
 * the milestone unless it is already done or still locked.
 */
export function NuxChecklistMilestoneRow({
  milestone,
  isDone,
  isLocked,
  lockedTooltip,
  onOpen,
  onToggleDone,
}: Readonly<Props>): ReactNode {
  const { i18n, t } = useLingui();
  const checkLabel = isDone ? t`Mark not done` : t`Mark done`;

  const rowStart = (
    <UnstyledButton
      className={clsx(
        classes.nuxChecklistMilestoneRowStart,
        isLocked && classes.nuxChecklistMilestoneRowLocked,
      )}
      disabled={isDone}
      aria-disabled={isLocked || isDone}
      onClick={() => {
        if (isLocked) {
          return;
        }
        onOpen();
      }}
    >
      <Stack gap={0}>
        <Text
          size="sm"
          fw={isDone ? 400 : 600}
          td={isDone ? "line-through" : undefined}
        >
          {i18n._(milestone.title)}
        </Text>
        {isDone ? null : (
          <Text size="xs" c="dimmed">
            {i18n._(milestone.summary)}
          </Text>
        )}
      </Stack>
    </UnstyledButton>
  );

  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <NuxChecklistMilestoneCheck
        milestoneKey={milestone.key}
        isDone={isDone}
        label={checkLabel}
        onToggleDone={onToggleDone}
      />
      {lockedTooltip ? (
        <Tooltip
          label={lockedTooltip}
          events={{ hover: true, focus: true, touch: false }}
        >
          {rowStart}
        </Tooltip>
      ) : (
        rowStart
      )}
    </Group>
  );
}
