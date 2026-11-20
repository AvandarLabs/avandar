import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent";
import { useLookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";
import { usePluginDisplayText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginDisplayText";
import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent";
import type { ImportedDatasetsState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
import type { LookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";

/** What a lookup of a plugin's imports says about its datasets so far. */
function _buildImportedDatasetsState(
  imported: ImportedPluginContent,
): ImportedDatasetsState {
  if (imported.isLoading || imported.isFetching) {
    return "loading";
  }
  if (imported.hasFailed) {
    return "failed";
  }
  return Object.keys(imported.importsByContentId).length > 0 ? "some" : "none";
}

/**
 * What the card knows about the datasets the plugin imported into this
 * workspace, and how its lookup stands. It reads the import rows, not the
 * manifest, so a plugin that is installed but no longer bundled is covered
 * too. The answer is `loading` while the lookup loads or refetches, and
 * Uninstall waits. Once the lookup has failed it is `failed`: the card says
 * so and offers a retry, and Uninstall falls back to a confirm that keeps
 * every dataset.
 */
function usePluginImportState(options: {
  installation: PluginInstallation.T | undefined;
  manifestModule: PluginManifestModule | undefined;
}): {
  importedDatasets: ImportedDatasetsState;
  lookupState: LookupState;
  retryLookup: () => void;
} {
  const { installation, manifestModule } = options;
  // A card always has an install or a manifest, so one of the ids is set.
  const imported = useImportedPluginContent(
    installation?.pluginId ?? manifestModule?.manifest.id ?? "",
  );
  const lookupState = useLookupState({
    hasFailed: imported.hasFailed,
    isLoading: imported.isFetching,
  });
  const importedDatasets = _buildImportedDatasetsState(imported);
  return { importedDatasets, lookupState, retryLookup: imported.refetch };
}

/** Everything a plugin's settings card shows and does, gathered once. */
export type PluginCardState = Readonly<{
  pluginName: string;
  description: string;
  status: PluginInstallStatus;
  actions: PluginInstallationActions;
  importedDatasets: ImportedDatasetsState;

  /** Where the lookup of the plugin's imported datasets stands. */
  lookupState: LookupState;
  retryLookup: () => void;
}>;

/**
 * The name, install status, actions and imported-datasets lookup of one
 * plugin, for its settings card. The card renders them and owns no logic.
 */
export function usePluginCardState(options: {
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;

  /** The id of the card's heading, where focus returns after an uninstall. */
  headingId: string;
}): PluginCardState {
  const { manifestModule, installation, headingId } = options;
  const { pluginName, description } = usePluginDisplayText(options);
  const status = getPluginInstallStatusFromInstallation({
    installation,
    manifestPermissions: manifestModule?.manifest.permissions,
  });
  const actions = usePluginInstallationActions({
    pluginName,
    manifestModule,
    installation,
    headingId,
  });
  const imports = usePluginImportState(options);
  return { pluginName, description, status, actions, ...imports };
}
