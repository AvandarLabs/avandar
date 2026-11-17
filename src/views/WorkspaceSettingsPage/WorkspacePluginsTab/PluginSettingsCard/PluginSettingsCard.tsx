import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Card, Group, Stack, Text } from "@mantine/core";
import { useId } from "react";
import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions";
import { PluginCardHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginCardHeading";
import { PluginLookupErrorCallout } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginLookupErrorCallout";
import { PluginInstalledSections } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginInstalledSections";
import { PluginManifestSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginManifestSummary";
import { usePluginDisplayText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginDisplayText";
import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
  canManage: boolean;
}>;

/**
 * Whether the plugin imported datasets into this workspace, and whether that
 * is not yet known. It reads the import rows, not the manifest, so a plugin
 * that is installed but no longer bundled is covered too. The answer is
 * unknown while the lookup loads or refetches, and Uninstall waits. Once the
 * lookup has failed the answer stays unknown, so the card says so and offers
 * a retry, and Uninstall falls back to a confirm that keeps every dataset.
 */
function usePluginImportState(options: {
  installation: PluginInstallation.T | undefined;
  manifestModule: PluginManifestModule | undefined;
}): {
  hasImportedDatasets: boolean;
  isLookingUpImportedDatasets: boolean;
  hasFailedImportedDatasetsLookup: boolean;
  retryImportedDatasetsLookup: () => void;
} {
  const { installation, manifestModule } = options;
  // A card always has an install or a manifest, so one of the ids is set.
  const importedContent = useImportedPluginContent(
    installation?.pluginId ?? manifestModule?.manifest.id ?? "",
  );
  return {
    hasImportedDatasets:
      Object.keys(importedContent.importsByContentId).length > 0,
    isLookingUpImportedDatasets:
      importedContent.isLoading || importedContent.isFetching,
    hasFailedImportedDatasetsLookup:
      importedContent.isError &&
      !importedContent.isLoading &&
      !importedContent.isFetching,
    retryImportedDatasetsLookup: importedContent.refetch,
  };
}

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
  const { t } = useLingui();
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
    manifestModule,
    installation,
  });
  const { retryImportedDatasetsLookup, ...importState } = usePluginImportState({
    installation,
    manifestModule,
  });
  // Only an admin of an installed plugin can uninstall it, so only they need
  // to hear that the uninstall's lookup failed.
  const shouldShowLookupError =
    importState.hasFailedImportedDatasetsLookup &&
    canManage &&
    installation !== undefined;
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
          {...importState}
          actions={actions}
        />
      </Group>
      {shouldShowLookupError ? (
        <Box mt="md">
          <PluginLookupErrorCallout
            message={t`We could not check whether this plugin imported datasets.`}
            onRetry={retryImportedDatasetsLookup}
          />
        </Box>
      ) : null}
      <PluginInstalledSections
        {...{ pluginName, manifestModule, installation, canManage }}
      />
    </Card>
  );
}
