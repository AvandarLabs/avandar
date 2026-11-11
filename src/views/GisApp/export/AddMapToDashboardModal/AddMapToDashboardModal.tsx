import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { SaveToDashboardCreateMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardCreateMode";
import { SaveToDashboardListMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardListMode";
import { useAddMapToDashboard } from "@/views/GisApp/export/AddMapToDashboardModal/useAddMapToDashboard";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = { mapId: AvaMap.Id; workspaceSlug: string; onClose: () => void };

const NO_DASHBOARDS: readonly Dashboard.T[] = [];

/** The current user's own dashboards in this workspace. */
function useOwnDashboards(): [
  dashboards: readonly Dashboard.T[],
  isLoading: boolean,
] {
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();
  const [dashboards, isLoadingDashboards] = DashboardClient.useGetAll({
    where: userProfile
      ? {
          workspace_id: { eq: workspace.id },
          owner_id: { eq: userProfile.userId },
        }
      : undefined,
    useQueryOptions: { enabled: userProfile !== undefined },
  });
  return [
    dashboards ?? NO_DASHBOARDS,
    isLoadingUserProfile || isLoadingDashboards,
  ];
}

/**
 * The body of the GIS "Add to dashboard" modal: pick one of your dashboards
 * or create one, with the same pickers as the explorer's "Save to dashboard".
 * Either way the dashboard gains a Map block showing this map.
 */
export function AddMapToDashboardModal({
  mapId,
  workspaceSlug,
  onClose,
}: Props): ReactNode {
  const { t } = useLingui();
  const [dashboards, isLoading] = useOwnDashboards();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const actions = useAddMapToDashboard({ mapId, workspaceSlug, onClose });
  const isMutating = actions.isAdding || actions.isCreating;
  const hasDashboards = dashboards.length > 0;
  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        {t`Pick a dashboard to add this map to, or create one.`}
      </Text>
      {isCreateMode || (!isLoading && !hasDashboards) ? (
        <SaveToDashboardCreateMode
          defaultName={t`Untitled dashboard`}
          isCreating={actions.isCreating}
          isDisabled={isMutating}
          showEmptyStateBanner={!hasDashboards}
          onBack={
            hasDashboards
              ? () => {
                  setIsCreateMode(false);
                }
              : undefined
          }
          onCancel={onClose}
          onSubmit={actions.createDashboard}
        />
      ) : (
        <SaveToDashboardListMode
          dashboards={dashboards}
          isLoading={isLoading}
          isSaving={actions.isAdding}
          isDisabled={isMutating}
          onSwitchToCreate={() => {
            setIsCreateMode(true);
          }}
          onCancel={onClose}
          onSelectAndSave={actions.addToDashboard}
        />
      )}
    </Stack>
  );
}
