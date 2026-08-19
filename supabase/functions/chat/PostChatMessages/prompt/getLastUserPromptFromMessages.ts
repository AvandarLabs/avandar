const VIEW_CHANGE_CONTENT_PREFIX = "[View changed:";

/**
 * Last typed user prompt in the thread. Trailing `[View changed:` client
 * messages are skipped so spatial docs, generated-SQL prompts, and the turn
 * suffix use user intent rather than view-event content.
 */
export function getLastUserPromptFromMessages(
  messages: ReadonlyArray<{ role: string; content: string }>,
): string {
  return (
    [...messages].reverse().find((message) => {
      return (
        message.role === "user" &&
        !message.content.startsWith(VIEW_CHANGE_CONTENT_PREFIX)
      );
    })?.content ?? ""
  );
}
