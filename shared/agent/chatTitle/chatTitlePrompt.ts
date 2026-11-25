type ChatTitleMessage = { role: "system" | "user"; content: string };

export const CHAT_TITLE_PROMPT_IDS = ["chat-title-v1"] as const;
export const CHAT_TITLE_PROMPT_ID = "chat-title-v1";
const TITLE_LIMIT = 80;

/** Reports whether a title prompt id is served by the chat edge function. */
export function isChatTitlePromptId(value: string): boolean {
  return (CHAT_TITLE_PROMPT_IDS as readonly string[]).includes(value);
}

/** Builds the model messages used to name a chat from its excerpt. */
export function buildChatTitleMessages(
  options: Readonly<{
    excerpt: string;
    locale: string;
    placeholder: string;
  }>,
): ChatTitleMessage[] {
  return [
    {
      role: "system",
      content: [
        "You name one chat for a tab.",
        "Reply with a short noun phrase in the requested locale.",
        "No quotes, no period, and no explanation.",
        "If the excerpt has no topic, reply with the placeholder exactly as it is written.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Locale: ${options.locale}`,
        `Placeholder: ${options.placeholder}`,
        "Excerpt:",
        options.excerpt,
      ].join("\n"),
    },
  ];
}

/** Returns a usable title from a model reply, or undefined as a fallback. */
export function parseChatTitleReply(
  reply: string,
  placeholder: string,
): string | undefined {
  const firstLine = reply.trim().split("\n")[0]?.trim() ?? "";
  const unquoted = firstLine.replace(/^["'](.*)["']$/, "$1").trim();
  if (unquoted.length === 0 || unquoted === placeholder.trim()) {
    return undefined;
  }
  return unquoted.length > TITLE_LIMIT
    ? unquoted.slice(0, TITLE_LIMIT).trim()
    : unquoted;
}
