import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { PluginContentImport } from "$/models/PluginContentImport/PluginContentImport";

/** The content a plugin already imported into the current workspace. */
export type ImportedPluginContent = Readonly<{
  /** Each import by the manifest content id it imported. */
  importsByContentId: Readonly<Record<string, PluginContentImport.T>>;
  isLoading: boolean;
}>;

/**
 * Loads which of a plugin's content items the current workspace already
 * imported, even through an earlier install. Use it wherever content is
 * offered for import, for example to disable an item the install wizard
 * would otherwise import twice, or to link an item to its dataset.
 */
export function useImportedPluginContent(
  pluginId: string,
): ImportedPluginContent {
  const workspace = useCurrentWorkspace();
  const [imports, isLoading] = PluginContentImportClient.useGetAll({
    where: {
      workspace_id: { eq: workspace.id },
      plugin_id: { eq: pluginId },
    },
  });
  return {
    importsByContentId: Object.fromEntries(
      (imports ?? []).map((contentImport) => {
        return [contentImport.contentId, contentImport];
      }),
    ),
    isLoading,
  };
}
