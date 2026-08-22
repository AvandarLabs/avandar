import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardOfflineStatus } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Group, Text } from "@mantine/core";

import { formatDashboardDate } from "@/views/DashboardApp/DashboardListView/formatDashboardDate";

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

  const visibilityBadge = matchLiteral(dashboard.visibility, {
    draft: () => {
      return null;
    },
    workspace: () => {
      return (
        <Badge size="xs" color="blue" variant="light">
          <Trans>Published to workspace</Trans>
        </Badge>
      );
    },
    public: () => {
      return (
        <Badge size="xs" color="orange" variant="light">
          <Trans>Public</Trans>
        </Badge>
      );
    },
  });

  const offlineStatusBadge = matchLiteral(offlineStatus, {
    none: () => {
      return null;
    },
    full: () => {
      return (
        <Badge size="xs" color="teal" variant="light">
          <Trans>Offline ready</Trans>
        </Badge>
      );
    },
    partial: () => {
      return (
        <Badge size="xs" color="yellow" variant="light">
          <Trans>Partially offline</Trans>
        </Badge>
      );
    },
  });

  return (
    <Group gap="xs">
      {!isOwnedByCurrentUser ? (
        <Badge size="xs" color="grape" variant="light">
          <Trans>Shared with you</Trans>
        </Badge>
      ) : null}
      {visibilityBadge}
      {offlineStatusBadge}
      <Text c="dimmed" size="xs">
        <Trans>Updated {formatDashboardDate(dashboard.updatedAt, i18n)}</Trans>
      </Text>
    </Group>
  );
}
