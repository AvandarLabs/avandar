import { Callout } from "@avandar/ui";
import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getBundledPluginEntries } from "@/lib/plugins/pluginIndexHelpers";
import { PluginSettingsList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsList";
import { useBundledPluginManifests } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useBundledPluginManifests";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

// A stable default, so a tab still loading its installs hands the list the
// same empty array on every render.
const NO_INSTALLATIONS: PluginInstallation.T[] = [];

/**
 * Lists the plugins this deployment bundles, plus any installed plugin it no
 * longer bundles, and lets settings admins install and manage them.
 */
export function WorkspacePluginsTab(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const canManage = useHasPermission("settings__can_manage_plugins");
  const [installations = NO_INSTALLATIONS, isLoadingInstallations] =
    PluginInstallationClient.useGetAll(
      where("workspace_id", "eq", workspace.id),
    );
  const [loadedManifests, isLoadingManifests] = useBundledPluginManifests();
  if (isLoadingInstallations || isLoadingManifests) {
    return <Loader aria-label={t`Loading plugins`} />;
  }
  return (
    <Stack gap="lg">
      <div>
        <Title order={4}>
          <Trans>Plugins</Trans>
        </Title>
        <Text c="dimmed" mt={4}>
          <Trans>
            Plugins add features to this workspace. Installing or removing a
            plugin affects every member.
          </Trans>
        </Text>
      </div>
      {loadedManifests?.hasFailures ? (
        <Callout
          messageSize="sm"
          message={t`Some plugins could not be loaded. Reload the page to try again.`}
        />
      ) : null}
      {getBundledPluginEntries().length === 0 ? (
        <Text>
          <Trans>No plugins are available in this deployment.</Trans>
        </Text>
      ) : null}
      <PluginSettingsList
        manifestModules={loadedManifests?.manifestModules ?? []}
        installations={installations}
        canManage={canManage}
      />
    </Stack>
  );
}
