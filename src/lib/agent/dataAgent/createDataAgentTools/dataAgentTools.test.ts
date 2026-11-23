import { describe, expect, it, vi } from "vitest";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { createLookupValuesTool } from "@/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool";
import { createPlanQueryTool } from "@/lib/agent/dataAgent/createDataAgentTools/planQueryTool";
import { createRunQueryTool } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { createDataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { QueryPlan } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const ALIASES = SqlTableAlias.fromSchema({
  datasets: [{ id: DATASET_ID, name: "deaths.csv" }],
});

function _createHost(overrides: Partial<DataAgentHost> = {}): DataAgentHost {
  return {
    showQuery: vi.fn(),
    readColumnValues: vi.fn(),
    askUser: vi.fn(),
    approveValuesForModel: vi.fn().mockResolvedValue(true),
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

describe("run_query", () => {
  async function _run(outcome: DataAgentQueryOutcome) {
    const state = createDataAgentRunState();
    const host = _createHost({ showQuery: vi.fn().mockResolvedValue(outcome) });
    const tool = createRunQueryTool({ host, aliases: ALIASES, state });
    const result = await tool.execute("call-1", {
      sql: 'SELECT "deaths" FROM "t0"',
      summary: "All deaths.",
    });
    return { result, state, host };
  }

  it("runs the SQL with dataset ids and ends the turn on rows", async () => {
    const { result, host } = await _run({
      kind: "rows",
      columns: [{ name: "deaths", type: "BIGINT" }],
      rowCount: 3,
    });

    expect(host.showQuery).toHaveBeenCalledWith(
      expect.objectContaining({ sql: `SELECT "deaths" FROM "${DATASET_ID}"` }),
    );
    expect(result.terminate).toBe(true);
    expect(_textOf(result)).toBe("Shown to the user: 3 rows; columns deaths.");
  });

  it("hands an empty result back to the model and asks for escalation", async () => {
    const { result, state } = await _run({
      kind: "empty",
      columns: [],
      rowCount: 0,
    });

    expect(result.terminate).toBe(false);
    expect(state.needsEscalation).toBe(true);
    expect(_textOf(result)).toContain("No rows matched");
  });

  it("does not show a query when the turn asks about columns", async () => {
    const state = createDataAgentRunState();
    state.userTexts = [
      "Are these two datasets appendable? Do they have the same columns?",
    ];
    const host = _createHost({
      showQuery: vi.fn().mockResolvedValue({
        kind: "rows",
        columns: [],
        rowCount: 1,
      }),
    });
    const tool = createRunQueryTool({ host, aliases: ALIASES, state });

    const result = await tool.execute("call-1", {
      sql: 'SELECT "deaths" FROM "t0"',
      summary: "Column list.",
    });

    expect(host.showQuery).not.toHaveBeenCalled();
    expect(state.lastQuery).toBeUndefined();
    expect(state.needsEscalation).toBe(false);
    expect(_textOf(result)).toContain("DATASETS");
  });

  it("strips literals from errors before the model sees them", async () => {
    const { result } = await _run({
      kind: "failed",
      error: "Conversion Error: Could not convert string 'Jane Doe' to INT64",
    });

    expect(result.isError).toBe(true);
    expect(_textOf(result)).not.toContain("Jane Doe");
  });
});

describe("lookup_values", () => {
  it("answers an exact match on the device, without a card", async () => {
    const state = createDataAgentRunState();
    const host = _createHost({
      readColumnValues: vi.fn().mockResolvedValue(["United Kingdom"]),
    });
    const tool = createLookupValuesTool({ host, aliases: ALIASES, state });

    const result = await tool.execute("call-1", {
      table: "t0",
      column: "country",
      values: [{ named: "UK", forms: ["United Kingdom"] }],
      question: "Which of these is the UK?",
    });

    expect(host.askUser).not.toHaveBeenCalled();
    expect(_textOf(result)).toContain('"UK" is stored as "United Kingdom"');
    expect(state.valuesSentToModel).toEqual(["United Kingdom"]);
  });

  it("shows a card and ends the turn when the browser defers the answer", async () => {
    const state = createDataAgentRunState();
    const host = _createHost({
      readColumnValues: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue(["Youth Mentoring", "Youth Sports"]),
      askUser: vi.fn().mockResolvedValue({ kind: "deferred" }),
    });
    const tool = createLookupValuesTool({ host, aliases: ALIASES, state });

    const result = await tool.execute("call-1", {
      table: "t0",
      column: "program",
      values: [{ named: "youth program", forms: [] }],
      question: "Which of these is the youth program?",
    });

    expect(host.askUser).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "values",
        options: ["Youth Mentoring", "Youth Sports"],
      }),
    );
    expect(result.terminate).toBe(true);
    expect(state.valuesSentToModel).toEqual([]);
  });

  it("refuses an alias that is not in the schema", async () => {
    const tool = createLookupValuesTool({
      host: _createHost(),
      aliases: ALIASES,
      state: createDataAgentRunState(),
    });

    await expect(
      tool.execute("call-1", {
        table: "t9",
        column: "country",
        values: [{ named: "UK", forms: [] }],
        question: "Which is the UK?",
      }),
    ).rejects.toThrow('Unknown table alias "t9"');
  });
});

describe("plan_query", () => {
  const DATASETS = [
    {
      id: DATASET_ID,
      name: "deaths.csv",
      columns: [
        { name: "state", dataType: "varchar" },
        { name: "deaths", dataType: "bigint" },
      ],
    },
  ];
  const PLAN: QueryPlan = {
    measures: [{ table: "t0", column: "deaths", name: "deaths" }],
    filters: [{ column: "state", values: ["Ohio", "All states"] }],
    from: "",
    to: "",
    relativePeriod: "none",
    timeGrain: "none",
    groupBy: [],
    calculation: "none",
    populationColumn: "",
    order: "time",
    limit: 0,
    onePerGroup: false,
    summary: "Deaths in Ohio.",
  };

  it("refuses filter values the data does not hold, before running", async () => {
    const host = _createHost({
      readColumnValues: vi.fn().mockResolvedValue(["Ohio"]),
    });
    const tool = createPlanQueryTool(
      { host, aliases: ALIASES, state: createDataAgentRunState() },
      DATASETS,
    );

    const result = await tool.execute("call-1", PLAN);

    expect(host.showQuery).not.toHaveBeenCalled();
    expect(_textOf(result)).toContain(
      '"All states" is not stored in t0."state"',
    );
  });

  it("runs the compiled SQL when every filter value is stored", async () => {
    const host = _createHost({
      readColumnValues: vi.fn().mockResolvedValue(["Ohio", "All states"]),
      showQuery: vi.fn().mockResolvedValue({
        kind: "rows",
        columns: [{ name: "deaths", type: "BIGINT" }],
        rowCount: 1,
      }),
    });
    const tool = createPlanQueryTool(
      { host, aliases: ALIASES, state: createDataAgentRunState() },
      DATASETS,
    );

    await tool.execute("call-1", PLAN);

    expect(host.showQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining(`FROM "${DATASET_ID}"`),
      }),
    );
  });
});
