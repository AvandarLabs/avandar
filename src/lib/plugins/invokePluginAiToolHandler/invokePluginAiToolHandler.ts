import { isPluginDefinition } from "@avandar/plugin-sdk";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { PluginAiToolArgs } from "@/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool";
import type { AgentToolContext, AvandarApi } from "@avandar/plugin-sdk";

/**
 * Loads a bundled plugin's code and calls the handler it declares for the
 * AI tool, with an `avandar` API that has no data slot members. Throws when
 * the plugin or the handler is missing, which the runner reports to the
 * model as a failed tool.
 *
 * Import it lazily, with a dynamic `import()` when the data agent calls a
 * plugin tool. It reaches the plugin SDK runtime and `makePluginApi`, which
 * `pnpm check:plugin-bundle` leaves out of the host budget only because
 * this module is one of its lazy runtimes.
 */
export async function invokePluginAiToolHandler(
  options: Readonly<{
    declaration: PluginAiToolDeclaration;
    context: AgentToolContext;
    args: PluginAiToolArgs;
    workspace: AvandarApi["workspace"];
  }>,
): Promise<unknown> {
  const { pluginId, name } = options.declaration;
  const entry = getPluginIndexEntry(pluginId);
  if (entry === undefined) {
    throw new Error(`Plugin "${pluginId}" is not bundled`);
  }
  const codeModule = await PluginModuleCache.loadCode(entry);
  const { definition } = codeModule;
  const handler =
    isPluginDefinition(definition) && Object.hasOwn(definition.aiTools, name)
      ? definition.aiTools[name]
      : undefined;
  if (typeof handler !== "function") {
    throw new Error(`Plugin "${pluginId}" has no AI tool "${name}"`);
  }
  const pluginApi = makePluginApi({
    pluginName: pluginId,
    context: options.context,
    workspace: options.workspace,
    messages: codeModule.messages,
  });
  return handler(pluginApi, options.args);
}
