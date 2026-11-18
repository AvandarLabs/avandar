import { renderAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock.ts";

/**
 * The block of a Data Explorer that shows nothing: no open dataset, no
 * query, no result columns. Rendered with the page block's own renderer, so
 * it stays the block's text however the renderer words it.
 */
const EMPTY_EXPLORER_BLOCK = renderAgentPageContextBlock(
  { app: "data-explorer" },
  {
    aliases: [],
    mask: (text) => {
      return text;
    },
  },
);

/**
 * The page block to send a model that has little room for text, with the
 * block of an empty Data Explorer left out: it says only which page the
 * user is on, which that model cannot use, and a small model reads each
 * extra block less well. Returns `pageBlock` as it is when it shows
 * anything, and when the last block sent showed something, so the model
 * hears the page cleared. Returns undefined when there is no block to send.
 *
 * Use it for a turn answered on the device, for example the offline agent's.
 * A hosted turn always sends its page block, since the proxy's prompt reads
 * it on every turn.
 */
export function omitEmptyPageBlock(
  options: Readonly<{
    pageBlock: string | undefined;
    /** The last page block sent in full, if any. Omitted blocks are not it. */
    previousPageBlock: string | undefined;
  }>,
): string | undefined {
  const { pageBlock, previousPageBlock } = options;
  if (pageBlock !== EMPTY_EXPLORER_BLOCK) {
    return pageBlock;
  }
  const hasHeardSomething =
    previousPageBlock !== undefined && previousPageBlock !== pageBlock;
  return hasHeardSomething ? pageBlock : undefined;
}
