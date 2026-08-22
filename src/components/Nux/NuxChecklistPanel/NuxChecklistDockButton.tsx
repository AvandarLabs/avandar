import type { CSSProperties, ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Portal } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import classes from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel.module.css";

type Props = {
  completedCount: number;
  totalMilestoneCount: number;
  dockStyle: CSSProperties;
  onExpand: () => void;
};

/** Collapsed Get started pill in the bottom-right corner. */
export function NuxChecklistDockButton({
  completedCount,
  totalMilestoneCount,
  dockStyle,
  onExpand,
}: Readonly<Props>): ReactNode {
  return (
    <Portal>
      <Button
        className={classes.nuxChecklistPanelDock}
        pos="fixed"
        bottom={16}
        style={dockStyle}
        size="compact-sm"
        rightSection={<IconChevronRight size={14} />}
        data-testid="nux-checklist"
        onClick={onExpand}
      >
        <Trans>
          Get started {completedCount}/{totalMilestoneCount}
        </Trans>
      </Button>
    </Portal>
  );
}
