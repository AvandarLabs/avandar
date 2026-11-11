import { getActivePluginAiToolsFromInstallations } from "$/agent/dataAgent/getActivePluginAiToolsFromInstallations.ts";
import { PLUGIN_AI_TOOLS } from "$/agent/dataAgent/pluginAiTools.gen.ts";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type InstallationRow = {
  plugin_id: string;
  is_enabled: boolean;
  granted_permissions: string[];
};

async function _loadInstallationRows(
  supabaseClient: AvaSupabaseClient,
  workspaceId: string,
): Promise<InstallationRow[]> {
  try {
    const { data } = await supabaseClient
      .from("plugin_installations")
      .select("plugin_id, is_enabled, granted_permissions")
      .eq("workspace_id", workspaceId)
      .throwOnError();
    return (data ?? []) as InstallationRow[];
  } catch (error) {
    console.error(
      "Could not read plugin installations for the data agent",
      error,
    );
    return [];
  }
}

/**
 * The plugin tools the data agent may offer the model in a workspace, read
 * from the workspace's plugin installations with the caller's own
 * permissions. Only tools of enabled installs that granted every permission
 * their manifest requests are returned. When the installations cannot be
 * read it returns none, so the agent still answers without plugin tools.
 * `tools` defaults to every tool the bundled plugins declare.
 */
export async function loadInstalledPluginAiTools(
  options: Readonly<{
    supabaseClient: AvaSupabaseClient;
    workspaceId: string;
    tools?: readonly PluginAiToolDeclaration[];
  }>,
): Promise<PluginAiToolDeclaration[]> {
  const rows = await _loadInstallationRows(
    options.supabaseClient,
    options.workspaceId,
  );
  return getActivePluginAiToolsFromInstallations({
    tools: options.tools ?? PLUGIN_AI_TOOLS,
    installations: rows.map((row) => {
      return {
        pluginId: row.plugin_id,
        isEnabled: row.is_enabled,
        grantedPermissions: row.granted_permissions,
      };
    }),
  });
}
