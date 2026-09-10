import { Trans } from "@lingui/react/macro";
import { Button, Card, Portal, Stack, Text } from "@mantine/core";
import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { NuxChecklistExpandedHeader } from "@/components/Nux/NuxChecklistPanel/NuxChecklistExpandedHeader";
import { NuxChecklistMilestoneList } from "@/components/Nux/NuxChecklistPanel/NuxChecklistMilestoneList";
import classes from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel.module.css";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { ReactNode } from "react";

type Props = {
  artifacts: NuxWorkspaceArtifacts | undefined;
  completedCount: number;
  dockStyle: { readonly right: number; readonly zIndex: number };
  markDone: (key: NuxProgress.MilestoneKey) => void;
  onOpenMilestone: (key: NuxProgress.MilestoneKey) => void;
  totalMilestoneCount: number;
  unmarkDone: (key: NuxProgress.MilestoneKey) => void;
};

/** Expanded Get started card with milestone rows and dismiss. */
export function NuxChecklistExpandedCard({
  artifacts,
  completedCount,
  dockStyle,
  markDone,
  onOpenMilestone,
  totalMilestoneCount,
  unmarkDone,
}: Readonly<Props>): ReactNode {
  const [state, dispatch] = NuxStateManager.useContext();
  return (
    <Portal>
      <Card
        withBorder
        shadow="md"
        padding="md"
        className={classes.nuxChecklistPanelDock}
        pos="fixed"
        bottom={16}
        w={320}
        style={dockStyle}
        data-testid="nux-checklist"
      >
        <Stack gap="sm">
          <NuxChecklistExpandedHeader
            completedCount={completedCount}
            totalMilestoneCount={totalMilestoneCount}
          />
          <NuxChecklistMilestoneList
            artifacts={artifacts}
            markDone={markDone}
            onOpenMilestone={onOpenMilestone}
            unmarkDone={unmarkDone}
          />
          {state.blockedReason ? (
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                {state.blockedReason}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => {
                  dispatch.skipActiveMilestone();
                }}
              >
                <Trans>Skip this step</Trans>
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Card>
    </Portal>
  );
}
