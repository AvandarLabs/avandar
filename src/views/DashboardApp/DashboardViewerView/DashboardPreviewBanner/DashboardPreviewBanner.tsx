import { Trans } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { IconArrowLeft, IconEye } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardPreviewVisibilitySummary } from "@/views/DashboardApp/DashboardViewerView/DashboardPreviewBanner/DashboardPreviewVisibilitySummary";
import classes from "./DashboardPreviewBanner.module.css";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  workspaceSlug: string;
  canEdit: boolean;
};

/** Identifies authenticated dashboard preview mode and links to the editor. */
export function DashboardPreviewBanner({
  dashboard,
  workspaceSlug,
  canEdit,
}: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  return (
    <Group
      className={classes.dashboardPreviewBannerRoot}
      gap="xs"
      justify="space-between"
      px="md"
      py="xs"
    >
      <Group gap="xs">
        <IconEye size={16} color="var(--mantine-color-blue-7)" />
        <Text size="sm" c="blue.9" fw={500}>
          <Trans>Previewing this dashboard</Trans>
        </Text>
        <DashboardPreviewVisibilitySummary visibility={dashboard.visibility} />
      </Group>
      {canEdit ? (
        <Button
          size="compact-sm"
          variant="outline"
          color="neutral"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => {
            navigate({
              to: "/$workspaceSlug/dashboards/edit/$dashboardId",
              params: { workspaceSlug, dashboardId: dashboard.id },
            });
          }}
        >
          <Trans>Back to editor</Trans>
        </Button>
      ) : null}
    </Group>
  );
}
