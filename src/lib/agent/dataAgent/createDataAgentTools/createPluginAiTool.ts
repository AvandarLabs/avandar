import { makeDataAgentToolsFromPluginAiTools } from "$/agent/dataAgent/makeDataAgentToolsFromPluginAiTools";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { AgentTool } from "@earendil-works/pi-agent-core";

/** The arguments the model passes to a plugin AI tool. */
export type PluginAiToolArgs = Readonly<
  Record<string, string | number | boolean>
>;

/**
 * Runs a plugin AI tool and returns the text its model reads back. The chat
 * injects it, so plugin code stays out of the agent module.
 */
export type RunPluginAiTool = (
  request: Readonly<{
    declaration: PluginAiToolDeclaration;
    args: PluginAiToolArgs;
  }>,
) => Promise<{ text: string; isError: boolean }>;

/**
 * The Pi tool for one plugin AI tool declaration. Each call goes to
 * `runPluginAiTool`, whose text becomes the tool result the model reads.
 * The turn goes on after it, so the model can answer from the result.
 */
export function createPluginAiTool(
  options: Readonly<{
    declaration: PluginAiToolDeclaration;
    runPluginAiTool: RunPluginAiTool;
  }>,
): AgentTool {
  const { declaration, runPluginAiTool } = options;
  const [piTool] = makeDataAgentToolsFromPluginAiTools([declaration]);
  return {
    ...piTool!,
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      const { text, isError } = await runPluginAiTool({
        declaration,
        args: params as PluginAiToolArgs,
      });
      return { content: [{ type: "text", text }], details: undefined, isError };
    },
  };
}
