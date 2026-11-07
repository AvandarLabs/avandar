import { Card, Group, Stack, Title } from "@mantine/core";
import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions";
import { PluginManifestSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginManifestSummary";
import { PluginStatusBadge } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginStatusBadge";
import { usePluginDisplayText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginDisplayText";
import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
  canManage: boolean;
}>;

/**
 * One plugin on the Plugins settings tab. Without a manifest module, the
 * plugin is installed but no longer bundled, so the card names it by id and
 * offers only Uninstall.
 */
export function PluginSettingsCard({
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element {
  const manifest = manifestModule?.manifest;
  const { pluginName, description } = usePluginDisplayText({
    manifestModule,
    installation,
  });
  const status = getPluginInstallStatusFromInstallation({
    installation,
    manifestPermissions: manifest?.permissions,
  });
  const actions = usePluginInstallationActions({
    pluginName,
    manifest,
    installation,
  });
  const PluginIcon =
    manifest === undefined ? undefined : manifestModule?.icons[manifest.icon];
  return (
    <Card component="section" aria-label={pluginName} padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group align="flex-start" wrap="nowrap">
          {PluginIcon ? <PluginIcon size={28} aria-hidden /> : null}
          <Stack gap="xxs">
            <Group gap="xs">
              <Title order={4}>{pluginName}</Title>
              <PluginStatusBadge status={status} />
            </Group>
            {manifest === undefined ? null : (
              <PluginManifestSummary
                manifest={manifest}
                description={description}
              />
            )}
          </Stack>
        </Group>
        <PluginActions
          status={status}
          pluginName={pluginName}
          canManage={canManage}
          actions={actions}
        />
      </Group>
    </Card>
  );
}
