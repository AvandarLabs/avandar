import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import type { PluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

/** The install wizard's view of a plugin's bundled content. */
export type InstallWizardContent = Readonly<{
  /** What the workspace already imported, even through an earlier install. */
  importedContent: ImportedPluginContent;

  /** The imports the wizard starts once the plugin is installed. */
  contentImports: PluginContentImports;

  /** Chosen items the workspace does not have yet, in manifest order. */
  itemsToImport: readonly PluginContentItem[];
}>;

/**
 * The content `PluginInstallWizard` offers and imports: what the workspace
 * already has, what the admin chose that it lacks, and the imports' progress.
 */
export function useInstallWizardContent(options: {
  manifestModule: PluginManifestModule;
  chosenContentIds: readonly string[];
}): InstallWizardContent {
  const { manifestModule, chosenContentIds } = options;
  const importedContent = useImportedPluginContent(manifestModule.manifest.id);
  const contentImports = usePluginContentImports(manifestModule);
  return {
    importedContent,
    contentImports,
    itemsToImport: manifestModule.manifest.contributes.content.filter(
      (item) => {
        return (
          chosenContentIds.includes(item.id) &&
          getOwnValue(importedContent.importsByContentId, item.id) === undefined
        );
      },
    ),
  };
}
