import { describe, expect, it } from "vitest";
import { buildAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock.ts";
import { omitEmptyPageBlock } from "$/agent/pageContext/omitEmptyPageBlock/omitEmptyPageBlock.ts";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext.ts";

function _blockOf(context: AgentPageContext): string {
  return buildAgentPageContextBlock({ context, aliases: [] });
}

const EMPTY_EXPLORER_BLOCK = _blockOf({
  app: "data-explorer",
  explorer: { resultColumns: [] },
});

const QUERY_BLOCK = _blockOf({
  app: "data-explorer",
  explorer: {
    sql: `SELECT SUM("cases") FROM "t0"`,
    resultColumns: [{ name: "sum", dataType: "bigint" }],
  },
});

describe("omitEmptyPageBlock", () => {
  it("leaves out the block of a Data Explorer that shows nothing, when none was sent before", () => {
    expect(
      omitEmptyPageBlock({
        pageBlock: EMPTY_EXPLORER_BLOCK,
        previousPageBlock: undefined,
      }),
    ).toBeUndefined();
  });

  it("leaves it out again when the last block sent was the same empty one", () => {
    expect(
      omitEmptyPageBlock({
        pageBlock: EMPTY_EXPLORER_BLOCK,
        previousPageBlock: EMPTY_EXPLORER_BLOCK,
      }),
    ).toBeUndefined();
  });

  it("keeps it when the last block sent showed something, so the model hears the page cleared", () => {
    expect(
      omitEmptyPageBlock({
        pageBlock: EMPTY_EXPLORER_BLOCK,
        previousPageBlock: QUERY_BLOCK,
      }),
    ).toBe(EMPTY_EXPLORER_BLOCK);
  });

  it.each([
    ["a query and its columns on screen", QUERY_BLOCK],
    [
      "an open dataset",
      _blockOf({
        app: "data-explorer",
        dataset: { id: "d-1", name: "us.csv" },
        explorer: { resultColumns: [] },
      }),
    ],
    [
      "a dashboard with charts",
      _blockOf({
        app: "dashboard",
        dashboard: {
          id: "d-2",
          name: "Budget",
          tiles: [{ title: "Cases", chartType: "line", sql: "SELECT 1" }],
        },
      }),
    ],
    ["a dashboard whose name did not load", _blockOf({ app: "dashboard" })],
    ["a map", _blockOf({ app: "map", map: { id: "m-1", name: "Ohio" } })],
    ["the dashboard list", _blockOf({ app: "dashboards" })],
  ])("keeps a block with %s", (_name, pageBlock) => {
    expect(
      omitEmptyPageBlock({ pageBlock, previousPageBlock: undefined }),
    ).toBe(pageBlock);
  });

  it("has nothing to keep when there is no block", () => {
    expect(
      omitEmptyPageBlock({
        pageBlock: undefined,
        previousPageBlock: QUERY_BLOCK,
      }),
    ).toBeUndefined();
  });
});
