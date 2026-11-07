import type {
  AssistantMessageEvent,
  ProxyAssistantMessageEvent,
} from "@sbfn/chat/PostAgentStream/agentStreamTypes.ts";

/**
 * Converts one model stream event into the event Pi's `streamProxy` client
 * reads. The partial message is dropped (the client rebuilds it), so each
 * event carries only what changed.
 */
export function toProxyEvent(
  event: AssistantMessageEvent,
): ProxyAssistantMessageEvent | undefined {
  switch (event.type) {
    case "start":
      return { type: "start" };
    case "text_start":
    case "thinking_start":
      return { type: event.type, contentIndex: event.contentIndex };
    case "text_delta":
    case "thinking_delta":
    case "toolcall_delta":
      return {
        type: event.type,
        contentIndex: event.contentIndex,
        delta: event.delta,
      };
    case "text_end":
    case "thinking_end": {
      const block = event.partial.content[event.contentIndex];
      const signature =
        block?.type === "text"
          ? block.textSignature
          : block?.type === "thinking"
            ? block.thinkingSignature
            : undefined;
      return {
        type: event.type,
        contentIndex: event.contentIndex,
        contentSignature: signature,
      };
    }
    case "toolcall_start": {
      const block = event.partial.content[event.contentIndex];
      return block?.type === "toolCall"
        ? {
            type: "toolcall_start",
            contentIndex: event.contentIndex,
            id: block.id,
            toolName: block.name,
          }
        : undefined;
    }
    case "toolcall_end":
      return {
        type: "toolcall_end",
        contentIndex: event.contentIndex,
        toolCall: event.toolCall,
      };
    case "done":
      // The proxy never asks for a deferred response, so a deferred stop
      // would leave the client waiting on a result it cannot fetch.
      if (event.reason === "deferred") {
        return {
          type: "error",
          reason: "error",
          errorMessage: "The model deferred its response",
          usage: event.message.usage,
        };
      }
      return {
        type: "done",
        reason: event.reason,
        usage: event.message.usage,
        providerThinkingLevel: event.message.providerThinkingLevel,
      };
    case "error":
      return {
        type: "error",
        reason: event.reason,
        errorMessage: event.error.errorMessage,
        usage: event.error.usage,
      };
    default:
      return undefined;
  }
}
