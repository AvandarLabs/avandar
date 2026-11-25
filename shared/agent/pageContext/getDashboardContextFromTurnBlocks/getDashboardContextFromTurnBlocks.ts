import {
  ATTACHED_CLEARED_BLOCK,
  ATTACHED_UNCHANGED_BLOCK,
  PAGE_UNCHANGED_BLOCK,
} from "$/agent/pageContext/buildAgentTurnText.ts";

/**
 * What the blocks that start an agent turn say about dashboards, for a
 * reader that cannot see the structured page and gadgets behind them, such
 * as the offline agent, which receives the turn as text.
 */
export type TurnDashboardContext = {
  /**
   * The page last sent in full is a dashboard. A turn whose page block says
   * "unchanged" keeps the answer the turn before it gave.
   */
  isPageDashboard: boolean;
  /**
   * The tray's last full block holds a dashboard or a chart from one. A
   * turn whose attached block says "unchanged" keeps the answer the turn
   * before it gave.
   */
  isAttachedDashboard: boolean;
  /**
   * This turn alone has a dashboard card line or an `@` mention of a
   * dashboard or a chart from one.
   */
  hasDashboardInTurn: boolean;
};

/**
 * The page block's lines that name a dashboard: the page line of a
 * dashboard page (the dashboard list page reads `Dashboard list`), and the
 * line with the open dashboard's name. Names are written as quoted JSON
 * strings, so a name can never start a line of its own.
 */
const DASHBOARD_PAGE_LINE = /^(?:Page: Dashboard$|Dashboard: )/m;

/** An attached block's numbered line for a dashboard or one of its charts. */
const ATTACHED_DASHBOARD_LINE = /^\d+\. (?:Dashboard|Chart) /m;

/** A mentioned block's line for a dashboard or one of its charts. */
const MENTIONED_DASHBOARD_LINE = /^@"(?:[^"\\]|\\.)*": (?:Dashboard|Chart) /m;

function _readBlock(blocks: string, tag: string): string | undefined {
  return new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`).exec(blocks)?.[0];
}

/**
 * The page flag for a turn: false without a page block, carried over from
 * `previous` when the block says "unchanged", else read from the block.
 */
function _readPageFlag(blocks: string, previous: boolean): boolean {
  const page = _readBlock(blocks, "current_page");
  if (page === undefined) {
    return false;
  }
  return page === PAGE_UNCHANGED_BLOCK
    ? previous
    : DASHBOARD_PAGE_LINE.test(page);
}

/**
 * The tray flag for a turn: false without an attached block or once it is
 * cleared, carried over from `previous` when it says "unchanged", else read
 * from the block.
 */
function _readAttachedFlag(blocks: string, previous: boolean): boolean {
  const attached = _readBlock(blocks, "attached");
  if (attached === undefined || attached === ATTACHED_CLEARED_BLOCK) {
    return false;
  }
  return attached === ATTACHED_UNCHANGED_BLOCK
    ? previous
    : ATTACHED_DASHBOARD_LINE.test(attached);
}

/**
 * Reads whether a turn's leading blocks (as `splitAgentTurnText` returns
 * them) involve a dashboard: the page is one, a dashboard or chart is
 * attached or mentioned, or a dashboard card line is there. `previous` is
 * the page and tray flags the turn before returned, so a block that says
 * "unchanged" keeps its earlier answer.
 *
 * Use it to decide whether a turn can be about a dashboard, for example to
 * offer a dashboard tool only then.
 */
export function getDashboardContextFromTurnBlocks(
  blocks: string,
  previous: Pick<
    TurnDashboardContext,
    "isPageDashboard" | "isAttachedDashboard"
  >,
): TurnDashboardContext {
  const mentioned = _readBlock(blocks, "mentioned") ?? "";
  return {
    isPageDashboard: _readPageFlag(blocks, previous.isPageDashboard),
    isAttachedDashboard: _readAttachedFlag(
      blocks,
      previous.isAttachedDashboard,
    ),
    hasDashboardInTurn:
      blocks.includes("<dashboard_card>") ||
      MENTIONED_DASHBOARD_LINE.test(mentioned),
  };
}
