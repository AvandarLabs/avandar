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
 * The text of one agent turn: the page block, the attached block, the
 * mentioned block, then the user's message. A page or attached block
 * identical to the previous turn's becomes one short line, so a long
 * conversation does not resend the same charts every turn. An attached
 * block that disappeared becomes one "nothing attached" line. The
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
  }>,
): string {
  const blocks = [
    _pageText(options.pageBlock, options.previousPageBlock),
    _attachedText(options.attachedBlock, options.previousAttachedBlock),
    options.mentionedBlock,
  ].filter((block): block is string => {
    return block !== undefined;
  });
  return [...blocks, options.message].join("\n\n");
}
