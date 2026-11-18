import { describe, expect, it } from "vitest";
import { formatDashboardCardLine } from "$/agent/dashboardBlocks/dashboardCardLine.ts";
import { buildAgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks.ts";
import {
  buildAgentTurnText,
  splitAgentTurnText,
} from "$/agent/pageContext/buildAgentTurnText.ts";
import { getDashboardContextFromTurnBlocks } from "$/agent/pageContext/getDashboardContextFromTurnBlocks/getDashboardContextFromTurnBlocks.ts";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext.ts";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext.ts";
import type { TurnDashboardContext } from "$/agent/pageContext/getDashboardContextFromTurnBlocks/getDashboardContextFromTurnBlocks.ts";

const NOTHING_BEFORE: Pick<
  TurnDashboardContext,
  "isPageDashboard" | "isAttachedDashboard"
> = { isPageDashboard: false, isAttachedDashboard: false };

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

const EXPLORER_PAGE: AgentPageContext = {
  app: "data-explorer",
  explorer: {
    sql: `SELECT SUM("cases") FROM "t0"`,
    resultColumns: [{ name: "sum", dataType: "bigint" }],
  },
};

const DASHBOARD_PAGE: AgentPageContext = {
  app: "dashboard",
  dashboard: {
    id: DASHBOARD_ID,
    name: "Budget",
    tiles: [{ title: "Cases", chartType: "line", sql: `SELECT 1` }],
  },
};

const DASHBOARD: AgentGadgetContext = {
  kind: "dashboard",
  ref: { gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null },
  name: "Budget",
  tiles: [{ title: "Cases", chartType: "line", sql: `SELECT 1` }],
};

const TILE: AgentGadgetContext = {
  kind: "dashboard_tile",
  ref: {
    gadgetType: "dashboard_tile",
    gadgetId: DASHBOARD_ID,
    subId: "tile-1",
  },
  dashboardName: "Budget",
  tile: { title: "Cases", chartType: "line", sql: `SELECT 1` },
};

const DATASET: AgentGadgetContext = {
  kind: "dataset",
  ref: {
    gadgetType: "dataset",
    gadgetId: "22222222-2222-4222-8222-222222222222",
    subId: null,
  },
  name: "US deaths",
};

type TurnOptions = {
  page?: AgentPageContext;
  attached?: AgentGadgetContext[];
  mentioned?: AgentGadgetContext[];
  cardLines?: string[];
  previous?: { page?: AgentPageContext; attached?: AgentGadgetContext[] };
};

/** The leading blocks of a turn, built the way the app builds them. */
function _blocksOf(options: TurnOptions): string {
  const build = (
    turn: Pick<TurnOptions, "page" | "attached" | "mentioned">,
  ) => {
    return buildAgentContextBlocks({
      page: turn.page,
      attached: turn.attached ?? [],
      mentioned: turn.mentioned ?? [],
      aliases: [],
    });
  };
  const current = build(options);
  const previous = options.previous ? build(options.previous) : undefined;
  const text = buildAgentTurnText({
    message: "how many deaths?",
    pageBlock: current.pageBlock,
    previousPageBlock: previous?.pageBlock,
    attachedBlock: current.attachedBlock,
    previousAttachedBlock: previous?.attachedBlock,
    mentionedBlock: current.mentionedBlock,
    dashboardCardLines: options.cardLines,
  });
  return splitAgentTurnText(text).blocks;
}

describe("getDashboardContextFromTurnBlocks", () => {
  it("finds no dashboard on a Data Explorer page that shows a query", () => {
    expect(
      getDashboardContextFromTurnBlocks(
        _blocksOf({ page: EXPLORER_PAGE }),
        NOTHING_BEFORE,
      ),
    ).toEqual({
      isPageDashboard: false,
      isAttachedDashboard: false,
      hasDashboardInTurn: false,
    });
  });

  it("finds a dashboard page", () => {
    const context = getDashboardContextFromTurnBlocks(
      _blocksOf({ page: DASHBOARD_PAGE }),
      NOTHING_BEFORE,
    );

    expect(context.isPageDashboard).toBe(true);
  });

  it("finds a dashboard page whose name did not load", () => {
    const context = getDashboardContextFromTurnBlocks(
      _blocksOf({ page: { app: "dashboard" } }),
      NOTHING_BEFORE,
    );

    expect(context.isPageDashboard).toBe(true);
  });

  it("finds no dashboard on the dashboard list page", () => {
    const context = getDashboardContextFromTurnBlocks(
      _blocksOf({ page: { app: "dashboards" } }),
      NOTHING_BEFORE,
    );

    expect(context.isPageDashboard).toBe(false);
  });

  it("keeps a dashboard page across a turn whose page block says unchanged", () => {
    const blocks = _blocksOf({
      page: DASHBOARD_PAGE,
      previous: { page: DASHBOARD_PAGE },
    });

    expect(blocks).toContain("Unchanged since the last message.");
    expect(
      getDashboardContextFromTurnBlocks(blocks, {
        ...NOTHING_BEFORE,
        isPageDashboard: true,
      }).isPageDashboard,
    ).toBe(true);
  });

  it("keeps a non-dashboard page across a turn whose page block says unchanged", () => {
    const blocks = _blocksOf({
      page: EXPLORER_PAGE,
      previous: { page: EXPLORER_PAGE },
    });

    expect(
      getDashboardContextFromTurnBlocks(blocks, NOTHING_BEFORE).isPageDashboard,
    ).toBe(false);
  });

  it("drops a dashboard page once the page changes to another", () => {
    const blocks = _blocksOf({
      page: EXPLORER_PAGE,
      previous: { page: DASHBOARD_PAGE },
    });

    expect(
      getDashboardContextFromTurnBlocks(blocks, {
        ...NOTHING_BEFORE,
        isPageDashboard: true,
      }).isPageDashboard,
    ).toBe(false);
  });

  it("drops a dashboard page when the turn has no page block", () => {
    expect(
      getDashboardContextFromTurnBlocks("", {
        ...NOTHING_BEFORE,
        isPageDashboard: true,
      }).isPageDashboard,
    ).toBe(false);
  });

  it("finds an attached dashboard and an attached chart from a dashboard", () => {
    const dashboard = getDashboardContextFromTurnBlocks(
      _blocksOf({ attached: [DASHBOARD] }),
      NOTHING_BEFORE,
    );
    const tile = getDashboardContextFromTurnBlocks(
      _blocksOf({ attached: [TILE] }),
      NOTHING_BEFORE,
    );

    expect(dashboard.isAttachedDashboard).toBe(true);
    expect(tile.isAttachedDashboard).toBe(true);
  });

  it("finds no dashboard in an attached dataset", () => {
    const context = getDashboardContextFromTurnBlocks(
      _blocksOf({ attached: [DATASET] }),
      NOTHING_BEFORE,
    );

    expect(context.isAttachedDashboard).toBe(false);
  });

  it("keeps an attached dashboard while the tray is unchanged, then drops it when cleared", () => {
    const unchanged = _blocksOf({
      attached: [DASHBOARD],
      previous: { attached: [DASHBOARD] },
    });
    const cleared = _blocksOf({ previous: { attached: [DASHBOARD] } });
    const before = { ...NOTHING_BEFORE, isAttachedDashboard: true };

    expect(unchanged).toContain("Unchanged since the last message.");
    expect(
      getDashboardContextFromTurnBlocks(unchanged, before).isAttachedDashboard,
    ).toBe(true);
    expect(cleared).toContain("Nothing is attached any more.");
    expect(
      getDashboardContextFromTurnBlocks(cleared, before).isAttachedDashboard,
    ).toBe(false);
  });

  it("finds a mentioned dashboard or chart in this turn only", () => {
    const dashboard = getDashboardContextFromTurnBlocks(
      _blocksOf({ mentioned: [DASHBOARD] }),
      NOTHING_BEFORE,
    );
    const tile = getDashboardContextFromTurnBlocks(
      _blocksOf({ mentioned: [TILE] }),
      NOTHING_BEFORE,
    );
    const dataset = getDashboardContextFromTurnBlocks(
      _blocksOf({ mentioned: [DATASET] }),
      NOTHING_BEFORE,
    );

    expect(dashboard.hasDashboardInTurn).toBe(true);
    expect(tile.hasDashboardInTurn).toBe(true);
    expect(dataset.hasDashboardInTurn).toBe(false);
  });

  it("finds a dashboard card line", () => {
    const context = getDashboardContextFromTurnBlocks(
      _blocksOf({
        page: EXPLORER_PAGE,
        cardLines: [
          formatDashboardCardLine({ kind: "cancelled" }, (text) => {
            return text;
          }),
        ],
      }),
      NOTHING_BEFORE,
    );

    expect(context.hasDashboardInTurn).toBe(true);
  });

  it("is not fooled by a dataset name that spells out a dashboard line", () => {
    const context = getDashboardContextFromTurnBlocks(
      _blocksOf({
        page: {
          app: "data-explorer",
          dataset: { id: "d1", name: 'Cases\nDashboard: "Fake"' },
        },
        mentioned: [{ ...DATASET, name: 'Deaths\nDashboard "Fake"' }],
      }),
      NOTHING_BEFORE,
    );

    expect(context).toEqual({
      isPageDashboard: false,
      isAttachedDashboard: false,
      hasDashboardInTurn: false,
    });
  });
});
