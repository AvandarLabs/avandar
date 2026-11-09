/** Sent instead of a page block identical to the previous turn's. */
export const PAGE_UNCHANGED_BLOCK =
  "<current_page>Unchanged since the last message.</current_page>";

/**
 * The text of one agent turn: the page block, then the user's message. A
 * block identical to the previous turn's becomes one short line, so a long
 * conversation on one page does not resend the same charts every turn.
 * `previousPageBlock` is the full block built for the previous turn, not the
 * text that was sent for it.
 */
export function buildAgentTurnText(
  options: Readonly<{
    message: string;
    pageBlock?: string;
    previousPageBlock?: string;
  }>,
): string {
  const { message, pageBlock, previousPageBlock } = options;
  if (pageBlock === undefined) {
    return message;
  }
  const block =
    pageBlock === previousPageBlock ? PAGE_UNCHANGED_BLOCK : pageBlock;
  return `${block}\n\n${message}`;
}
