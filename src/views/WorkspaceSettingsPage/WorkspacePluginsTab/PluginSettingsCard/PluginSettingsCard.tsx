import { Card, Group } from "@mantine/core";
import { useId } from "react";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions";
import { PluginCardSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginCardSummary";
import { PluginImportLookupFeedback } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginImportLookupFeedback";
import { usePluginCardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginCardState";
import { PluginInstalledSections } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginInstalledSections";
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
 * says why it can only be uninstalled, and offers only Uninstall. When the
 * card cannot tell whether the plugin imported datasets, an admin of an
 * installed plugin sees an alert with a Retry, and Uninstall keeps every
 * dataset.
 */
export function PluginSettingsCard({
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element {
  const headingId = useId();
  const state = usePluginCardState({ manifestModule, installation });
  const { pluginName } = state;
  return (
    <Card component="section" aria-labelledby={headingId} padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <PluginCardSummary
          {...{ headingId, pluginName, manifestModule }}
          status={state.status}
          description={state.description}
        />
        <PluginActions
          status={state.status}
          pluginName={pluginName}
          headingId={headingId}
          canManage={canManage}
          importedDatasets={state.importedDatasets}
          actions={state.actions}
        />
      </Group>
      {/* Only an admin of an installed plugin can uninstall it. */}
      {canManage && installation !== undefined ? (
        <PluginImportLookupFeedback
          state={state.lookupState}
          onRetry={state.retryLookup}
          headingId={headingId}
        />
      ) : null}
      <PluginInstalledSections
        {...{ pluginName, manifestModule, installation, canManage }}
      />
    </Card>
  );
}
