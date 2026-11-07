import { Callout } from "@avandar/ui";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PluginsTabContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginsTabContent";
import { PluginsTabHeader } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginsTabHeader";
import { useBundledPluginManifests } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useBundledPluginManifests";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

// A stable default, so a tab still loading its installs hands the list the
// same empty array on every render.
const NO_INSTALLATIONS: PluginInstallation.T[] = [];

/**
 * Lists the plugins this deployment bundles, plus any installed plugin it no
 * longer bundles, and lets settings admins install and manage them. When the
 * workspace's installs fail to load it shows an error and no cards, because
 * without them every plugin would look uninstalled.
 */
export function WorkspacePluginsTab(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const canManage = useHasPermission("settings__can_manage_plugins");
  // Refetched on mount, because a reload right after an install restores the
  // pre-install snapshot from the persisted cache, which would otherwise
  // count as fresh and show the plugin as not installed.
  const [
    installations = NO_INSTALLATIONS,
    isLoadingInstallations,
    installationsQuery,
  ] = PluginInstallationClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [loadedManifests, isLoadingManifests] = useBundledPluginManifests();
  if (isLoadingInstallations || isLoadingManifests) {
    return <Loader role="status" aria-label={t`Loading plugins`} />;
  }
  return (
    <Stack gap="lg">
      <PluginsTabHeader canManage={canManage} />
      {installationsQuery.isError ? (
        <Callout
          messageSize="sm"
          message={t`Could not load this workspace's plugins. Reload to try again.`}
        />
      ) : (
        <PluginsTabContent
          loadedManifests={loadedManifests}
          installations={installations}
          canManage={canManage}
        />
      )}
    </Stack>
  );
}
