import { describe, expect, it, vi } from "vitest";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { createAddDashboardBlockTool } from "@/lib/agent/dataAgent/createDataAgentTools/addDashboardBlockTool";
import { createDataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const ALIASES = SqlTableAlias.fromSchema({
  datasets: [{ id: DATASET_ID, name: "deaths.csv" }],
});
const HEADING = { kind: "HeadingBlock", text: "Deaths in 2022" };
const CHART = {
  kind: "DataViz",
  prompt: "Deaths",
  sql: `SELECT "deaths" FROM "t0" WHERE "state" = 'Ohio'`,
  vizType: "bar",
};

const _ROWS_OUTCOME = {
  kind: "rows",
  columns: [
    { name: "state", type: "VARCHAR" },
    { name: "deaths", type: "INTEGER" },
  ],
  rowCount: 3,
};

function _createHost(overrides: Partial<DataAgentHost> = {}): DataAgentHost {
  return {
    showQuery: vi.fn(),
    readColumnValues: vi.fn(),
    askUser: vi.fn(),
    approveValuesForModel: vi.fn().mockResolvedValue(true),
    checkQuery: vi
      .fn()
      .mockResolvedValue({ kind: "rows", columns: [], rowCount: 3 }),
    addDashboardBlock: vi.fn().mockResolvedValue({ kind: "card_shown" }),
    ...overrides,
  };
}

function _textOf(result: { content: Array<{ type: string }> }): string {
  return result.content
    .map((block) => {
      return "text" in block ? String(block.text) : "";
    })
    .join("\n");
}

async function _add(
  host: DataAgentHost,
  block: Record<string, unknown>,
  state = createDataAgentRunState(),
) {
  const tool = createAddDashboardBlockTool({ host, aliases: ALIASES, state });
  const result = await tool.execute("call-1", {
    dashboard: "COVID 2022",
    block,
    summary: "Added a heading to COVID 2022.",
  } as Parameters<typeof tool.execute>[1]);
  return { result, state };
}

describe("add_dashboard_block", () => {
  it("shows a card for a text block and ends the turn on its summary", async () => {
    const host = _createHost();
    const { result, state } = await _add(host, HEADING);

    expect(host.addDashboardBlock).toHaveBeenCalledWith({
      dashboard: "COVID 2022",
      block: { kind: "HeadingBlock", text: "Deaths in 2022" },
      summary: "Added a heading to COVID 2022.",
    });
    expect(host.checkQuery).not.toHaveBeenCalled();
    expect(result.terminate).toBe(true);
    expect(_textOf(result)).toContain("Nothing changes until they confirm");
    expect(state.dashboardBlock).toEqual({
      summary: "Added a heading to COVID 2022.",
    });
  });

  it("says the open editor got it unsaved", async () => {
    const host = _createHost({
      addDashboardBlock: vi.fn().mockResolvedValue({ kind: "added_to_editor" }),
    });
    const { result } = await _add(host, HEADING);

    expect(_textOf(result)).toBe("Added to the open dashboard (unsaved).");
    expect(result.terminate).toBe(true);
  });

  it("tells the model a chart's row count and columns on the editor path", async () => {
    const host = _createHost({
      checkQuery: vi.fn().mockResolvedValue(_ROWS_OUTCOME),
      addDashboardBlock: vi.fn().mockResolvedValue({ kind: "added_to_editor" }),
    });
    const { result } = await _add(host, CHART);

    expect(_textOf(result)).toBe(
      "Added to the open dashboard (unsaved). The chart has 3 rows; columns state, deaths.",
    );
    expect(result.terminate).toBe(true);
  });

  it("tells the model a chart's row count and columns on the card path", async () => {
    const host = _createHost({
      checkQuery: vi.fn().mockResolvedValue(_ROWS_OUTCOME),
    });
    const { result } = await _add(host, CHART);

    expect(_textOf(result)).toBe(
      "The card is on the user's screen. Nothing changes until they confirm. The chart has 3 rows; columns state, deaths.",
    );
    expect(result.terminate).toBe(true);
  });

  it("still adds a chart with no rows and says it had none", async () => {
    const host = _createHost({
      checkQuery: vi.fn().mockResolvedValue({
        kind: "empty",
        columns: [{ name: "deaths", type: "INTEGER" }],
        rowCount: 0,
      }),
      addDashboardBlock: vi.fn().mockResolvedValue({ kind: "added_to_editor" }),
    });
    const { result, state } = await _add(host, CHART);

    expect(host.addDashboardBlock).toHaveBeenCalledTimes(1);
    expect(_textOf(result)).toBe(
      "Added to the open dashboard (unsaved). The chart has 0 rows; columns deaths.",
    );
    expect(result.terminate).toBe(true);
    expect(state.needsEscalation).toBe(false);
  });

  it("never puts preview rows in the result", async () => {
    const host = _createHost({
      checkQuery: vi.fn().mockResolvedValue({
        ..._ROWS_OUTCOME,
        previewRows: [["SENTINEL_STATE", 987654]],
      }),
    });
    const { result } = await _add(host, CHART);

    expect(_textOf(result)).not.toContain("SENTINEL_STATE");
    expect(_textOf(result)).not.toContain("987654");
  });

  it("checks a chart's SQL with table names and the consent check first", async () => {
    const host = _createHost();
    const { state } = await _add(host, CHART);
    const resolvedSql = `SELECT "deaths" FROM "${DATASET_ID}" WHERE "state" = 'Ohio'`;

    expect(host.approveValuesForModel).toHaveBeenCalledWith({
      values: ["Ohio"],
      reason: "query_filter",
    });
    expect(host.checkQuery).toHaveBeenCalledWith(resolvedSql);
    expect(host.addDashboardBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ sql: resolvedSql }),
      }),
    );
    expect(state.queryRuns).toBe(1);
  });

  it("hands a failed chart query back and asks for escalation", async () => {
    const host = _createHost({
      checkQuery: vi
        .fn()
        .mockResolvedValue({ kind: "failed", error: "no column deaths" }),
    });
    const { result, state } = await _add(host, CHART);

    expect(result.isError).toBe(true);
    expect(result.terminate).toBe(false);
    expect(state.needsEscalation).toBe(true);
    expect(host.addDashboardBlock).not.toHaveBeenCalled();
  });

  it("ends the turn when a failed check uses the last query", async () => {
    const state = createDataAgentRunState();
    state.queryRuns = 2;
    const host = _createHost({
      checkQuery: vi.fn().mockResolvedValue({ kind: "failed", error: "x" }),
    });
    const { result } = await _add(host, CHART, state);

    expect(result.terminate).toBe(true);
  });

  it("adds nothing when the user declines the filter values", async () => {
    const host = _createHost({
      approveValuesForModel: vi.fn().mockResolvedValue(false),
    });
    await _add(host, CHART);

    expect(host.checkQuery).not.toHaveBeenCalled();
    expect(host.addDashboardBlock).not.toHaveBeenCalled();
  });

  it("returns the reason for invalid fields", async () => {
    const host = _createHost();
    const { result } = await _add(host, { kind: "HeadingBlock" });

    expect(result.isError).toBe(true);
    expect(_textOf(result)).toBe("Invalid block: HeadingBlock needs text.");
    expect(host.addDashboardBlock).not.toHaveBeenCalled();
  });

  it("refuses a second block in one answer", async () => {
    const host = _createHost();
    const { state } = await _add(host, HEADING);
    const { result } = await _add(host, HEADING, state);

    expect(_textOf(result)).toMatch(/Only one block per answer/);
    expect(host.addDashboardBlock).toHaveBeenCalledTimes(1);
  });

  it("tells the model when no dashboard matched, without ending the turn", async () => {
    const host = _createHost({
      addDashboardBlock: vi.fn().mockResolvedValue({ kind: "not_found" }),
    });
    const { result, state } = await _add(host, HEADING);

    expect(_textOf(result)).toContain('No dashboard named "COVID 2022"');
    expect(result.terminate).toBeFalsy();
    expect(state.dashboardBlock).toBeUndefined();
  });

  it("says dashboards cannot change on a host without them", async () => {
    const host = _createHost({
      addDashboardBlock: undefined,
      checkQuery: undefined,
    });
    const { result } = await _add(host, HEADING);

    expect(_textOf(result)).toMatch(/cannot be changed from here/);
  });
});
