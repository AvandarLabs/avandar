import { definePlugin } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { runPluginCommand } from "@/lib/plugins/runPluginCommand/runPluginCommand";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginCodeModule } from "@/lib/plugins/PluginIndex.types";
import type {
  CommandHandler,
  DataExplorerToolbarContext,
  QueryHandle,
} from "@avandar/plugin-sdk";

const PLUGIN = { entry: { id: "avandar.test" } } as ActivePlugin;
const CONTEXT: DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar",
  queryHandle: "handle" as QueryHandle,
  columns: [],
  rowCount: 0,
};
const WORKSPACE = { id: "w", slug: "w", locale: "en" };

function _makeCodeModuleFromCommands(
  commands: Record<string, CommandHandler>,
): PluginCodeModule {
  return { definition: definePlugin({ commands }), messages: { en: {} } };
}

function _runCommandFromLoader(options: {
  loadCode: () => Promise<PluginCodeModule>;
  commandId?: string;
}) {
  return runPluginCommand({
    plugin: PLUGIN,
    pluginName: "Test",
    commandId: options.commandId ?? "hello",
    context: CONTEXT,
    workspace: WORKSPACE,
    loadCode: options.loadCode,
  });
}

describe("runPluginCommand", () => {
  it("runs the handler with an API scoped to the invocation", async () => {
    const handler = vi.fn();
    const failure = await _runCommandFromLoader({
      loadCode: async () => {
        return _makeCodeModuleFromCommands({ hello: handler });
      },
    });
    expect(failure).toBeUndefined();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ context: CONTEXT, workspace: WORKSPACE }),
    );
  });

  it("reports load_failed when the plugin code cannot load", async () => {
    const failure = await _runCommandFromLoader({
      loadCode: async () => {
        throw new Error("offline");
      },
    });
    expect(failure?.kind).toBe("load_failed");
  });

  it("reports missing_handler when the command is not defined", async () => {
    const failure = await _runCommandFromLoader({
      loadCode: async () => {
        return _makeCodeModuleFromCommands({});
      },
    });
    expect(failure?.kind).toBe("missing_handler");
  });

  it("reports missing_handler for an id inherited from Object", async () => {
    const failure = await _runCommandFromLoader({
      commandId: "constructor",
      loadCode: async () => {
        return _makeCodeModuleFromCommands({});
      },
    });
    expect(failure?.kind).toBe("missing_handler");
  });

  it("reports missing_handler when the module exports no definition", async () => {
    const failure = await _runCommandFromLoader({
      loadCode: async () => {
        return { definition: { commands: {} }, messages: { en: {} } };
      },
    });
    expect(failure?.kind).toBe("missing_handler");
  });

  it("reports command_failed with the error a handler throws", async () => {
    const thrownError = new Error("boom");
    const failure = await _runCommandFromLoader({
      loadCode: async () => {
        return _makeCodeModuleFromCommands({
          hello: () => {
            throw thrownError;
          },
        });
      },
    });
    expect(failure).toEqual({ kind: "command_failed", error: thrownError });
  });

  it("reports command_failed when an async handler rejects", async () => {
    const failure = await _runCommandFromLoader({
      loadCode: async () => {
        return _makeCodeModuleFromCommands({
          hello: async () => {
            throw new Error("later");
          },
        });
      },
    });
    expect(failure?.kind).toBe("command_failed");
  });
});
