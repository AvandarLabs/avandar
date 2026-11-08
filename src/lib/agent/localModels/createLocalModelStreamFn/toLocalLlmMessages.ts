import {
  contentText,
  getSystemMessageText,
  renderSystemMessageUpdate,
} from "@earendil-works/pi-ai";
import {
  buildLocalActionInstructions,
  formatLocalAction,
} from "@/lib/agent/localModels/createLocalModelStreamFn/localActionFormat";
import type { LocalLlmMessage } from "@/lib/agent/localModels/LocalLlm";
import type {
  AssistantMessage,
  Message,
  SystemMessage,
  Tool,
  TranscriptContext,
} from "@earendil-works/pi-ai";

/** The tools available at the end of the transcript, in the order added. */
export function getActiveTools(context: TranscriptContext): Tool[] {
  const toolsByName = new Map<string, Tool>();
  for (const message of context.messages) {
    if (message.role !== "system") {
      continue;
    }
    for (const tool of message.toolsAdded ?? []) {
      toolsByName.set(tool.name, tool);
    }
    for (const removed of message.toolsRemoved ?? []) {
      toolsByName.delete(removed.name);
    }
  }
  return [...toolsByName.values()];
}

function _formatAssistant(message: AssistantMessage): string {
  const toolCall = message.content.find((block) => {
    return block.type === "toolCall";
  });
  if (toolCall?.type === "toolCall") {
    return formatLocalAction({
      kind: "tool",
      name: toolCall.name,
      args: toolCall.arguments,
    });
  }
  const text = message.content
    .flatMap((block) => {
      return block.type === "text" ? [block.text] : [];
    })
    .join("\n");
  return formatLocalAction({ kind: "reply", text });
}

function _toLocalMessage(
  message: Message,
  isLeadingSystem: boolean,
): LocalLlmMessage | undefined {
  switch (message.role) {
    case "system":
      // Chat templates for small models accept one system message, so a
      // later system update reaches the model as a user message.
      return isLeadingSystem
        ? undefined
        : { role: "user", content: renderSystemMessageUpdate(message) };
    case "user":
      return { role: "user", content: contentText(message.content) };
    case "assistant":
      return { role: "assistant", content: _formatAssistant(message) };
    case "toolResult":
      return {
        role: "user",
        content: `Result of ${message.toolName}:\n${contentText(message.content)}`,
      };
  }
}

/**
 * Turns Pi's transcript into plain chat messages for a local model: one
 * system message (the prompt, then the reply format and tool list), then the
 * conversation, with tool calls written as JSON actions and tool results as
 * user messages.
 */
export function toLocalLlmMessages(
  context: TranscriptContext,
): LocalLlmMessage[] {
  const leading = context.messages[0];
  const systemText =
    leading?.role === "system"
      ? getSystemMessageText(leading as SystemMessage)
      : "";
  const instructions = buildLocalActionInstructions(getActiveTools(context));
  const conversation = context.messages.flatMap((message, index) => {
    const localMessage = _toLocalMessage(message, index === 0);
    return localMessage ? [localMessage] : [];
  });
  return [
    { role: "system", content: `${systemText}\n\n${instructions}`.trim() },
    ...conversation,
  ];
}
