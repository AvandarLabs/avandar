import { SimpleGrid, Stack } from "@mantine/core";
import { DashboardCard } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { DashboardOfflineStatus } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { UserId } from "$/models/User/User.types";
import type { ReactNode } from "react";

type Props = {
  dashboards: readonly Dashboard.T[];
  currentUserId: UserId | undefined;
  getOfflineStatus: (dashboard: Dashboard.T) => DashboardOfflineStatus;
  onOpenDashboard: (dashboardId: string) => void;
};

/** The dashboard list's card grid. */
export function DashboardGrid({
  dashboards,
  currentUserId,
  getOfflineStatus,
  onOpenDashboard,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {dashboards.map((dashboard) => {
          return (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              // Until the profile lands there is no owner to compare
              // against, and the ambiguous answer has to be the quiet
              // one: `false` would badge every card on the grid,
              // including your own, and then un-badge them a tick later.
              isOwnedByCurrentUser={
                currentUserId ? dashboard.ownerId === currentUserId : true
              }
              offlineStatus={getOfflineStatus(dashboard)}
              onClick={() => {
                onOpenDashboard(dashboard.id);
              }}
            />
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
