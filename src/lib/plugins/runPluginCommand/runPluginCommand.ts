import { isPluginDefinition } from "@avandar/plugin-sdk";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
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

/**
 * Why a plugin command did not complete. The plugin menu slot reads it to
 * report the failure to the user.
 *
 * `load_failed` covers plugin code that did not load, including a load that
 * resolves without a module. `missing_handler` means the module loaded but
 * declares no function for the command. `command_failed` means the handler,
 * or reading it from the module, threw.
 */
export type PluginCommandFailure = Readonly<{
  kind: "load_failed" | "missing_handler" | "command_failed";
  error?: unknown;
}>;

/**
 * Reads the handler a plugin's code module declares for a command id. Only
 * the module's own commands count, so an id such as `constructor` finds
 * nothing, and an entry that is not a function does not count either.
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
  const handler = definition.commands[commandId];
  return typeof handler === "function" ? handler : undefined;
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
export async function runPluginCommand(
  options: Readonly<{
    plugin: ActivePlugin;
    pluginName: string;
    commandId: string;
    context: PluginInvocationContext;
    workspace: AvandarApi["workspace"];

    /** What a Data Explorer toolbar command changes its query through. */
    dataExplorerBridge?: DataExplorerBridge;
    loadCode: (
      entry: PluginIndexEntry,
    ) => Promise<PluginCodeModule | undefined>;
  }>,
): Promise<PluginCommandFailure | undefined> {
  const { plugin, pluginName, commandId, context, workspace } = options;
  let codeModule: PluginCodeModule | undefined;
  try {
    codeModule = await options.loadCode(plugin.entry);
  } catch (error) {
    return { kind: "load_failed", error };
  }
  if (codeModule === undefined) {
    return { kind: "load_failed" };
  }
  // Plugin code is untrusted, so reading its handler can throw too.
  try {
    const handler = _getHandlerFromCodeModule({ codeModule, commandId });
    if (handler === undefined) {
      return { kind: "missing_handler" };
    }
    const api = makePluginApi({
      pluginName,
      context,
      workspace,
      messages: codeModule.messages,
      dataExplorerBridge: options.dataExplorerBridge,
    });
    await handler(api);
    return undefined;
  } catch (error) {
    return { kind: "command_failed", error };
  }
}
