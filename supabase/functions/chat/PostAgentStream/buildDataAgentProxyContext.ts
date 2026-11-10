import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { buildDataAgentSystemPrompt } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import { DATA_AGENT_TOOLS } from "$/agent/dataAgent/dataAgentTools.ts";
import { makeDataAgentToolsFromPluginAiTools } from "$/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.ts";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import type { DataAgentPromptId } from "$/agent/dataAgent/dataAgentTools.ts";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";
import type { Context, Message } from "@earendil-works/pi-ai";

const CONVERSATION_ROLES = new Set(["user", "assistant", "toolResult"]);

type ClientMessage = { role?: unknown; content?: unknown; toolName?: unknown };

function _assertKnownTool(
  name: unknown,
  toolNames: ReadonlySet<string>,
): void {
  if (typeof name !== "string" || !toolNames.has(name)) {
    throw new AvaHTTPError(
      `The data agent has no tool "${String(name)}"`,
      BAD_REQUEST,
    );
  }
}

/** Throws for a tool call or result naming a tool the agent was not given. */
function _assertKnownTools(
  message: ClientMessage,
  toolNames: ReadonlySet<string>,
): void {
  if (message.role === "toolResult") {
    _assertKnownTool(message.toolName, toolNames);
  }
  if (message.role === "assistant" && Array.isArray(message.content)) {
    for (const block of message.content as ClientMessage[]) {
      const toolCall = block as { type?: unknown; name?: unknown };
      if (toolCall.type === "toolCall") {
        _assertKnownTool(toolCall.name, toolNames);
      }
    }
  }
}

/**
 * The request the agent proxy sends to the model: the server's own system
 * prompt (built from the workspace's datasets) and tool list, and only the
 * conversation from the browser. Any system message the browser sends is
 * dropped, so a caller cannot replace the prompt or add tools, and a tool
 * call or result for a tool the agent does not have is refused. The tools
 * are the built-in `DATA_AGENT_TOOLS` followed by `pluginTools`, the plugin
 * tools active in the workspace.
 */
export function buildDataAgentProxyContext(
  options: Readonly<{
    clientMessages: readonly unknown[];
    datasets: readonly DataAgentDataset[];
    today: string;
    promptId: DataAgentPromptId;
    pluginTools: readonly PluginAiToolDeclaration[];
  }>,
): Context {
  const tools = [
    ...DATA_AGENT_TOOLS,
    ...makeDataAgentToolsFromPluginAiTools(options.pluginTools),
  ].map((tool) => {
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    };
  });
  const toolNames = new Set(
    tools.map((tool) => {
      return tool.name;
    }),
  );
  const messages = options.clientMessages.filter((message) => {
    const role = (message as ClientMessage).role;
    return typeof role === "string" && CONVERSATION_ROLES.has(role);
  }) as ClientMessage[];
  messages.forEach((message) => {
    _assertKnownTools(message, toolNames);
  });
  return {
    systemPrompt: buildDataAgentSystemPrompt({
      datasets: options.datasets,
      today: options.today,
      promptId: options.promptId,
    }),
    tools,
    messages: messages as Message[],
  };
}
