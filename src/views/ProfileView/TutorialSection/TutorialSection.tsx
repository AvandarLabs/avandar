import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Divider, Group, Stack, Text, Title } from "@mantine/core";

import { restartFirstDashboardTutorial } from "@/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial";
import { useNuxNavigation } from "@/components/Nux/NuxRoot/useNuxNavigation";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";

/**
 * Lets a user replay the onboarding tutorial.
 *
 * A restart deliberately replays all four milestones rather than skipping the
 * ones the workspace already satisfies: someone who asks to see the tutorial
 * again wants the tutorial, not "you are already done".
 */
export function TutorialSection(): ReactNode {
  const isNuxEligible = useNuxEligibility();
  const nuxDispatch = NuxStateManager.useDispatch();
  const openMilestone = useNuxNavigation();
  const workspace = useCurrentWorkspace();

  if (!isNuxEligible) {
    return null;
  }

  return (
    <>
      <Divider />
      <Stack gap="xs">
        <Title order={3} size="h5">
          <Trans>Tutorial</Trans>
        </Title>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text c="dimmed" size="sm">
            <Trans>
              Walk through building and sharing a dashboard again, from the top.
            </Trans>
          </Text>
          <Button
            variant="default"
            onClick={() => {
              restartFirstDashboardTutorial({
                restart: nuxDispatch.restart,
                openMilestone,
              });
              void AnalyticsClient.logEvent({
                event: "nux.restarted",
                workspaceId: workspace.id,
              });
            }}
          >
            <Trans>Restart tutorial</Trans>
          </Button>
        </Group>
      </Stack>
    </>
  );
}
