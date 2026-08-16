import { mantineColorVar } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useState } from "react";
import { formatDashboardDate } from "@/views/DashboardApp/DashboardListView/formatDashboardDate";
import type { I18n } from "@lingui/core";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

/** How much of a dashboard is readable with no network. */
export type DashboardOfflineStatus = "full" | "partial" | "none";

type Props = {
  dashboard: Dashboard.T;
  offlineStatus?: DashboardOfflineStatus;
  onClick?: () => void;
  /** Drives the "Shared with you" badge; there is deliberately no "Yours". */
  isOwnedByCurrentUser: boolean;
};

/**
 * The card's status line: who else can reach the dashboard, how much of it
 * works offline, and when it last changed.
 *
 * Takes `i18n` rather than `t`: a module-level helper cannot call `useLingui`,
 * and threading the macro `t` in would hide these strings from the extractor.
 */
function _renderBadgeRow(
  options: Readonly<{
    dashboard: Dashboard.T;
    offlineStatus: DashboardOfflineStatus;
    isOwnedByCurrentUser: boolean;
    i18n: I18n;
  }>,
): ReactNode {
  const { dashboard, offlineStatus, isOwnedByCurrentUser, i18n } = options;
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

/** One dashboard in the list grid. */
export function DashboardCard({
  dashboard,
  offlineStatus = "none",
  onClick,
  isOwnedByCurrentUser,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const [isHovered, setIsHovered] = useState(false);

  const onMouseEnter = () => {
    setIsHovered(true);
  };

  const onMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Card
      p="xl"
      radius="md"
      withBorder
      shadow={isHovered ? "lg" : "md"}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      styles={{
        root: {
          cursor: onClick ? "pointer" : "default",
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
          borderColor:
            isHovered ?
              mantineColorVar("primary.3")
            : mantineColorVar("gray.3"),
          transition:
            "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
        },
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon radius="md" size={40} variant="light">
              <IconLayoutDashboard size={22} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={650} size="lg" lineClamp={1}>
                {dashboard.name}
              </Text>
              <Text c="dimmed" size="sm" lineClamp={2}>
                {dashboard.description ?? (
                  <Trans>No description has been added yet.</Trans>
                )}
              </Text>
            </Stack>
          </Group>
        </Group>

        {_renderBadgeRow({
          dashboard,
          offlineStatus,
          isOwnedByCurrentUser,
          i18n,
        })}
      </Stack>
    </Card>
  );
}
