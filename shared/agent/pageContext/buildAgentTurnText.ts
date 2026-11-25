/** Sent instead of a page block identical to the previous turn's. */
export const PAGE_UNCHANGED_BLOCK =
  "<current_page>Unchanged since the last message.</current_page>";

/** Sent instead of an attached block identical to the previous turn's. */
export const ATTACHED_UNCHANGED_BLOCK =
  "<attached>Unchanged since the last message.</attached>";

/**
 * Sent once when the tray held something last turn and is empty now, so the
 * model stops relying on the last attached block it saw.
 */
export const ATTACHED_CLEARED_BLOCK =
  "<attached>Nothing is attached any more.</attached>";

/** Sent before the message on a hosted Try again of the latest answer. */
export const TRY_AGAIN_LINE =
  "The user clicked Try again: they want a different answer to the message below than your last one above, one that still does everything the message asks, exactly as asked, even what your last answer already did, since that answer is the one being replaced. Do not repeat it, but if the message has only one right answer, give that answer again, reached another way. Read the message another way, take a different approach, or ask one question if your last answer had to guess, but never change what the message asks for.";

function _pageText(
  pageBlock: string | undefined,
  previousPageBlock: string | undefined,
): string | undefined {
  if (pageBlock === undefined) {
    return undefined;
  }
  return pageBlock === previousPageBlock ? PAGE_UNCHANGED_BLOCK : pageBlock;
}

function _attachedText(
  attachedBlock: string | undefined,
  previousAttachedBlock: string | undefined,
): string | undefined {
  if (attachedBlock === undefined) {
    return previousAttachedBlock === undefined
      ? undefined
      : ATTACHED_CLEARED_BLOCK;
  }
  return attachedBlock === previousAttachedBlock
    ? ATTACHED_UNCHANGED_BLOCK
    : attachedBlock;
}

/**
 * The text of one agent turn: the dashboard card lines, the page block, the
 * attached block, the mentioned block, then the user's message. On a Try
 * again the Try again line goes between the blocks and the message. A page
 * or attached block identical to the previous turn's becomes one short line,
 * so a long conversation does not resend the same charts every turn. An
 * attached block that disappeared becomes one "nothing attached" line. The
 * `previous*` options are the full blocks built for the previous turn, not
 * the text that was sent for it.
 */
export function buildAgentTurnText(
  options: Readonly<{
    message: string;
    pageBlock?: string;
    previousPageBlock?: string;
    attachedBlock?: string;
    previousAttachedBlock?: string;
    mentionedBlock?: string;
    /**
     * Lines about cards the user resolved since the agent last heard, sent
     * first.
     */
    dashboardCardLines?: readonly string[];
    /**
     * A hosted Try again of the latest answer: the line goes before the
     * message.
     */
    isRetry?: boolean;
  }>,
): string {
  const blocks = [
    ...(options.dashboardCardLines ?? []),
    _pageText(options.pageBlock, options.previousPageBlock),
    _attachedText(options.attachedBlock, options.previousAttachedBlock),
    options.mentionedBlock,
  ].filter((block): block is string => {
    return block !== undefined;
  });
  const retryLines = options.isRetry ? [TRY_AGAIN_LINE] : [];
  return [...blocks, ...retryLines, options.message].join("\n\n");
}

/** The blocks at the start of a turn's text, each with its blank line. */
const LEADING_TURN_BLOCKS =
  /^(?:<(dashboard_card|current_page|attached|mentioned)>[\s\S]*?<\/\1>(?:\n\n|$))*/;

/**
 * A turn's text split into the blocks `buildAgentTurnText` put first and
 * the message after them. The offline router and value matcher read only
 * the message. Tag starts inside a block are escaped when it is built, so
 * a block's closing tag is always its own.
 */
export function splitAgentTurnText(text: string): {
  blocks: string;
  message: string;
} {
  const leading = LEADING_TURN_BLOCKS.exec(text)?.[0] ?? "";
  return { blocks: leading.trimEnd(), message: text.slice(leading.length) };
}
