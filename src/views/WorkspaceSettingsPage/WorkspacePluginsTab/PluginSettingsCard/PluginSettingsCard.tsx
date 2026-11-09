import { Trans } from "@lingui/react/macro";
import { Card, Group, Stack, Text } from "@mantine/core";
import { useId } from "react";
import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions";
import { PluginCardHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginCardHeading";
import { PluginManifestSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginManifestSummary";
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
 * plugin is installed but no longer bundled, so the card names it by id,
 * says why it can only be uninstalled, and offers only Uninstall.
 */
export function PluginSettingsCard({
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element {
  const headingId = useId();
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
  return (
    <Card component="section" aria-labelledby={headingId} padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap="xxs">
          <PluginCardHeading
            headingId={headingId}
            pluginName={pluginName}
            icon={
              manifest === undefined
                ? undefined
                : manifestModule?.icons[manifest.icon]
            }
            status={status}
          />
          {manifestModule === undefined ? (
            <Text size="sm" c="dimmed">
              <Trans>
                No longer included in this deployment. Uninstall to remove it
                from this workspace.
              </Trans>
            </Text>
          ) : (
            <PluginManifestSummary
              manifestModule={manifestModule}
              description={description}
              headingId={headingId}
            />
          )}
        </Stack>
        <PluginActions
          status={status}
          pluginName={pluginName}
          headingId={headingId}
          canManage={canManage}
          actions={actions}
        />
      </Group>
    </Card>
  );
}
