import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { buildDataAgentSystemPrompt } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import { DATA_AGENT_TOOLS } from "$/agent/dataAgent/dataAgentTools.ts";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import type { DataAgentPromptId } from "$/agent/dataAgent/dataAgentTools.ts";
import type { Context, Message } from "@earendil-works/pi-ai";

const CONVERSATION_ROLES = new Set(["user", "assistant", "toolResult"]);

const TOOL_NAMES = new Set<string>(
  DATA_AGENT_TOOLS.map((tool) => {
    return tool.name;
  }),
);

type ClientMessage = { role?: unknown; content?: unknown; toolName?: unknown };

function _assertKnownTool(name: unknown): void {
  if (typeof name !== "string" || !TOOL_NAMES.has(name)) {
    throw new AvaHTTPError(
      `The data agent has no tool "${String(name)}"`,
      BAD_REQUEST,
    );
  }
}

/** Throws for a tool call or result naming a tool the agent was not given. */
function _assertKnownTools(message: ClientMessage): void {
  if (message.role === "toolResult") {
    _assertKnownTool(message.toolName);
  }
  if (message.role === "assistant" && Array.isArray(message.content)) {
    for (const block of message.content as ClientMessage[]) {
      const toolCall = block as { type?: unknown; name?: unknown };
      if (toolCall.type === "toolCall") {
        _assertKnownTool(toolCall.name);
      }
    }
  }
}

/**
 * The request the agent proxy sends to the model: the server's own system
 * prompt (built from the workspace's datasets) and tool list, and only the
 * conversation from the browser. Any system message the browser sends is
 * dropped, so a caller cannot replace the prompt or add tools, and a tool
 * call or result for a tool the agent does not have is refused.
 */
export function buildDataAgentProxyContext(
  options: Readonly<{
    clientMessages: readonly unknown[];
    datasets: readonly DataAgentDataset[];
    today: string;
    promptId: DataAgentPromptId;
  }>,
): Context {
  const messages = options.clientMessages.filter((message) => {
    const role = (message as ClientMessage).role;
    return typeof role === "string" && CONVERSATION_ROLES.has(role);
  }) as ClientMessage[];
  messages.forEach(_assertKnownTools);
  return {
    systemPrompt: buildDataAgentSystemPrompt({
      datasets: options.datasets,
      today: options.today,
      promptId: options.promptId,
    }),
    tools: DATA_AGENT_TOOLS.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      };
    }),
    messages: messages as Message[],
  };
}
