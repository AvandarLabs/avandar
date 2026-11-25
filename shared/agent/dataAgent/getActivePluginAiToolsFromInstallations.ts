import { isPluginContributionActive } from "$/agent/dataAgent/isPluginContributionActive.ts";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";

type PluginInstallationSummary = {
  pluginId: string;
  isEnabled: boolean;
  grantedPermissions: readonly string[];
};

/**
 * Gets the data-agent tools a workspace may offer the model: those whose
 * plugin is installed, enabled, and granted every permission its manifest
 * requests. A tool whose plugin is not installed is dropped.
 *
 * Use it wherever a workspace's installations decide which plugin tools are
 * live, for example when the agent proxy builds the model's tool list.
 */
export function getActivePluginAiToolsFromInstallations(
  options: Readonly<{
    installations: ReadonlyArray<Readonly<PluginInstallationSummary>>;
    tools: readonly PluginAiToolDeclaration[];
  }>,
): PluginAiToolDeclaration[] {
  const installationsByPluginId = new Map(
    options.installations.map((installation) => {
      return [installation.pluginId, installation];
    }),
  );
  return options.tools.filter((tool) => {
    const installation = installationsByPluginId.get(tool.pluginId);
    return (
      installation !== undefined &&
      isPluginContributionActive({
        isEnabled: installation.isEnabled,
        grantedPermissions: installation.grantedPermissions,
        manifestPermissions: tool.permissions,
      })
    );
  });
}
