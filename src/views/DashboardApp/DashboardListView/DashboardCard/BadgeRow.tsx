import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Group, Text } from "@mantine/core";
import { formatDashboardDate } from "@/views/DashboardApp/DashboardListView/formatDashboardDate";
import type { DashboardOfflineStatus } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  offlineStatus: DashboardOfflineStatus;
  /** Drives the "Shared with you" badge; there is deliberately no "Yours". */
  isOwnedByCurrentUser: boolean;
};

/**
 * The card's status line: who else can reach the dashboard, how much of it
 * works offline, and when it last changed.
 */
export function BadgeRow({
  dashboard,
  offlineStatus,
  isOwnedByCurrentUser,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  return (
    <Group gap="xs">
      {!isOwnedByCurrentUser ?
        <Badge size="xs" color="grape" variant="light">
          <Trans>Shared with you</Trans>
        </Badge>
      : null}
      {dashboard.visibility === "workspace" ?
        <Badge size="xs" color="blue" variant="light">
          <Trans>Published to workspace</Trans>
        </Badge>
      : null}
      {dashboard.visibility === "public" ?
        <Badge size="xs" color="orange" variant="light">
          <Trans>Public</Trans>
        </Badge>
      : null}
      {offlineStatus === "full" ?
        <Badge size="xs" color="teal" variant="light">
          <Trans>Offline ready</Trans>
        </Badge>
      : null}
      {offlineStatus === "partial" ?
        <Badge size="xs" color="yellow" variant="light">
          <Trans>Partially offline</Trans>
        </Badge>
      : null}
      <Text c="dimmed" size="xs">
        <Trans>Updated {formatDashboardDate(dashboard.updatedAt, i18n)}</Trans>
      </Text>
    </Group>
  );
}
