import { isPluginDefinition } from "@avandar/plugin-sdk";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type {
  PluginCodeModule,
  PluginIndexEntry,
} from "@/lib/plugins/PluginIndex.types";
import type {
  AvandarApi,
  CommandHandler,
  PluginInvocationContext,
} from "@avandar/plugin-sdk";

/** Why a plugin command did not complete. */
export type PluginCommandFailure = Readonly<{
  kind: "load_failed" | "missing_handler" | "command_failed";
  error?: unknown;
}>;

/**
 * Reads the handler a plugin's code module declares for a command id. Only
 * the module's own commands count, so an id such as `constructor` finds
 * nothing.
 */
function _getHandlerFromCodeModule(options: {
  codeModule: PluginCodeModule;
  commandId: string;
}): CommandHandler | undefined {
  const { codeModule, commandId } = options;
  const { definition } = codeModule;
  if (
    !isPluginDefinition(definition) ||
    !Object.hasOwn(definition.commands, commandId)
  ) {
    return undefined;
  }
  return definition.commands[commandId];
}

/**
 * Loads a plugin's code if needed, then runs one of its commands with a
 * freshly scoped API. Returns undefined on success and never throws, so the
 * caller decides how to report a failure, such as a menu item that shows a
 * notification.
 *
 * Import it lazily, with a dynamic `import()` at the time a user picks a
 * command. It reaches the plugin SDK runtime and Lingui's message compiler
 * through `makePluginApi`, and a static import from anything rendered at
 * startup would put both in the main bundle.
 */
export async function runPluginCommand(options: {
  plugin: ActivePlugin;
  pluginName: string;
  commandId: string;
  context: PluginInvocationContext;
  workspace: AvandarApi["workspace"];
  loadCode: (entry: PluginIndexEntry) => Promise<PluginCodeModule>;
}): Promise<PluginCommandFailure | undefined> {
  const { plugin, pluginName, commandId, context, workspace } = options;
  let codeModule: PluginCodeModule;
  try {
    codeModule = await options.loadCode(plugin.entry);
  } catch (error) {
    return { kind: "load_failed", error };
  }
  const handler = _getHandlerFromCodeModule({ codeModule, commandId });
  if (handler === undefined) {
    return { kind: "missing_handler" };
  }
  try {
    const api = makePluginApi({
      pluginName,
      context,
      workspace,
      messages: codeModule.messages,
    });
    await handler(api);
    return undefined;
  } catch (error) {
    return { kind: "command_failed", error };
  }
}
