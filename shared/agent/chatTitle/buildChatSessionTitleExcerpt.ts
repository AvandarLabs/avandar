import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken.ts";

const EXCERPT_LIMIT = 2000;

type ExcerptMessage = {
  role: string;
  content: unknown;
  metadata?: { custom?: Record<string, unknown> };
};

function _textParts(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((part): part is { type: "text"; text: string } => {
      return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      );
    })
    .map((part) => {
      return part.text;
    })
    .join("\n");
}

function _latest(
  messages: readonly ExcerptMessage[],
  role: string,
): ExcerptMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === role) {
      return message;
    }
  }
  return undefined;
}

/**
 * The user and assistant text a title model may see.
 *
 * A later title request uses this string so the model never sees gadget
 * ids, SQL, or unmasked names. Pass the hosted turn's messages, the same
 * mask the turn used, and the offline-answer sentence.
 */
export function buildChatSessionTitleExcerpt(options: {
  messages: readonly ExcerptMessage[];
  mask: (text: string) => string;
  offlineAnswerText: string;
}): string {
  const user = _latest(options.messages, "user");
  const assistant = _latest(options.messages, "assistant");
  const userText = options.mask(
    ChatMentionToken.toModelText(_textParts(user?.content), (ref) => {
      return ref.gadgetType;
    }),
  );
  const assistantIsOffline =
    assistant?.metadata?.custom?.isOfflineAnswer === true;
  const assistantText = assistantIsOffline
    ? options.offlineAnswerText
    : options.mask(_textParts(assistant?.content));
  const excerpt = `user: ${userText}\nassistant: ${assistantText}`;
  return excerpt.length > EXCERPT_LIMIT
    ? excerpt.slice(0, EXCERPT_LIMIT)
    : excerpt;
}
