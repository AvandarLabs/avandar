import { describe, expect, it, vi } from "vitest";
import { createRunQueryTool } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { createDataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import { createPlaceholderRestoringHost } from "@/lib/agent/dataAgent/pagePrivacy/createPlaceholderRestoringHost";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

const PAGE_SQL = `SELECT COUNT(*) FROM t WHERE "patient_name" = 'Kings'`;
const MODEL_SQL = `SELECT week, COUNT(*) FROM t WHERE "patient_name" = '<value 1>' GROUP BY 1`;
const RESTORED_SQL = `SELECT week, COUNT(*) FROM t WHERE "patient_name" = 'Kings' GROUP BY 1`;

function _createVault(): ReturnType<typeof createSqlPlaceholderVault> {
  const vault = createSqlPlaceholderVault();
  vault.redact(PAGE_SQL, {
    isSensitiveColumn: (columnName) => {
      return columnName === "patient_name";
    },
    isSensitiveValue: () => {
      return false;
    },
  });
  return vault;
}

function _createInnerHost(overrides: Partial<DataAgentHost>): DataAgentHost {
  return {
    showQuery: vi.fn().mockResolvedValue({
      kind: "rows",
      columns: [{ name: "week", type: "date" }],
      rowCount: 52,
    }),
    readColumnValues: vi.fn().mockResolvedValue([]),
    askUser: vi.fn(),
    approveValuesForModel: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("createPlaceholderRestoringHost", () => {
  it("restores placeholders before a query runs", async () => {
    const inner = _createInnerHost({});
    const host = createPlaceholderRestoringHost(inner, _createVault());

    await host.showQuery({ sql: MODEL_SQL, summary: "Weekly" });

    expect(inner.showQuery).toHaveBeenCalledWith({
      sql: RESTORED_SQL,
      summary: "Weekly",
    });
  });

  it("restores placeholders before a value lookup runs", async () => {
    const inner = _createInnerHost({
      readColumnValues: vi.fn().mockResolvedValue(["Kings", "Queens"]),
    });
    const host = createPlaceholderRestoringHost(inner, _createVault());

    const values = await host.readColumnValues(MODEL_SQL);

    expect(inner.readColumnValues).toHaveBeenCalledWith(RESTORED_SQL);
    // A placeholder's value found by its own lookup goes back as the
    // placeholder, so the lookup never tells the model what it stands for.
    expect(values).toEqual(["<value 1>", "Queens"]);
  });

  it("returns a lookup without placeholders as it is", async () => {
    const inner = _createInnerHost({
      readColumnValues: vi.fn().mockResolvedValue(["Kings", "Queens"]),
    });
    const host = createPlaceholderRestoringHost(inner, _createVault());

    expect(await host.readColumnValues("SELECT DISTINCT x FROM t")).toEqual([
      "Kings",
      "Queens",
    ]);
  });

  it("masks restored values in result column names and errors", async () => {
    const inner = _createInnerHost({
      showQuery: vi.fn().mockResolvedValue({
        kind: "rows",
        columns: [
          {
            name: `count_star() FILTER (WHERE (patient_name = 'Kings'))`,
            type: "bigint",
          },
        ],
        rowCount: 1,
        previewRows: [["Kings", 3]],
      }),
    });
    const host = createPlaceholderRestoringHost(inner, _createVault());

    const outcome = await host.showQuery({ sql: MODEL_SQL, summary: "s" });

    expect(outcome).toEqual({
      kind: "rows",
      columns: [
        {
          name: `count_star() FILTER (WHERE (patient_name = '<value 1>'))`,
          type: "bigint",
        },
      ],
      rowCount: 1,
      previewRows: [["<value 1>", 3]],
    });
  });

  it("masks values held only because their SQL was unread, as words", async () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT "x" FROM t WHERE "county" = 'Kings' GROUP BY ALL`, {
      isSensitiveColumn: () => {
        return false;
      },
      isSensitiveValue: () => {
        return false;
      },
    });
    const inner = _createInnerHost({
      showQuery: vi.fn().mockResolvedValue({
        kind: "failed",
        error: "Binder Error: Kings is not a column",
      }),
    });
    const host = createPlaceholderRestoringHost(inner, vault);

    expect(
      await host.showQuery({
        sql: `SELECT 1 FROM t WHERE "county" = '<value 1>'`,
        summary: "s",
      }),
    ).toEqual({
      kind: "failed",
      error: "Binder Error: <value 1> is not a column",
    });
  });

  it("masks restored values in a failed query's error", async () => {
    const inner = _createInnerHost({
      showQuery: vi.fn().mockResolvedValue({
        kind: "failed",
        error: "Conversion Error: Kings is not a number",
      }),
    });
    const host = createPlaceholderRestoringHost(inner, _createVault());

    expect(await host.showQuery({ sql: MODEL_SQL, summary: "s" })).toEqual({
      kind: "failed",
      error: "Conversion Error: <value 1> is not a number",
    });
  });

  it.each([
    [`SELECT 1 FROM t WHERE x = '<value 4>'`, "unknown placeholder"],
    [`SELECT 1 FROM t WHERE x LIKE '%<value 1>%'`, "whole quoted value"],
  ])("refuses %s without running it", async (sql, problem) => {
    const inner = _createInnerHost({});
    const host = createPlaceholderRestoringHost(inner, _createVault());

    const outcome = await host.showQuery({ sql, summary: "s" });

    expect(inner.showQuery).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      kind: "failed",
      error: expect.stringContaining(problem),
    });
  });

  it("refuses a lookup with an unknown placeholder without running it", async () => {
    const inner = _createInnerHost({});
    const host = createPlaceholderRestoringHost(inner, _createVault());

    const values = await host.readColumnValues(
      `SELECT 1 WHERE x = '<value 4>'`,
    );

    expect(inner.readColumnValues).not.toHaveBeenCalled();
    expect(values).toEqual({ error: expect.stringContaining("unknown") });
  });

  it("tells tools which placeholders it holds", () => {
    const host = createPlaceholderRestoringHost(
      _createInnerHost({}),
      _createVault(),
    );

    expect(host.isHeldPlaceholder?.("<value 1>")).toBe(true);
    expect(host.isHeldPlaceholder?.("<value 2>")).toBe(false);
  });

  it("keeps restored values out of what the model reads", async () => {
    const inner = _createInnerHost({
      showQuery: vi.fn().mockResolvedValue({
        kind: "failed",
        error: `Binder Error: no rows for 'Kings'`,
      }),
    });
    const tool = createRunQueryTool({
      host: createPlaceholderRestoringHost(inner, _createVault()),
      aliases: [],
      state: createDataAgentRunState(),
    });

    const result = await tool.execute("call-1", {
      sql: MODEL_SQL,
      summary: "Weekly",
    });

    expect(inner.showQuery).toHaveBeenCalledWith(
      expect.objectContaining({ sql: RESTORED_SQL }),
    );
    expect(JSON.stringify(result)).not.toContain("Kings");
  });

  it("restores a chart check's SQL and masks what comes back", async () => {
    const checkQuery = vi.fn().mockResolvedValue({
      kind: "failed",
      error: "Conversion Error: Kings is not a number",
    });
    const host = createPlaceholderRestoringHost(
      _createInnerHost({ checkQuery }),
      _createVault(),
    );

    const outcome = await host.checkQuery!(MODEL_SQL);

    expect(checkQuery).toHaveBeenCalledWith(RESTORED_SQL);
    expect(outcome).toEqual({
      kind: "failed",
      error: "Conversion Error: <value 1> is not a number",
    });
  });

  it("refuses a chart check with an unknown placeholder", async () => {
    const checkQuery = vi.fn();
    const host = createPlaceholderRestoringHost(
      _createInnerHost({ checkQuery }),
      _createVault(),
    );

    const outcome = await host.checkQuery!(`SELECT 1 WHERE x = '<value 4>'`);

    expect(checkQuery).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      kind: "failed",
      error: expect.stringContaining("unknown"),
    });
  });

  it("restores the dashboard name and the block before adding it", async () => {
    const addDashboardBlock = vi.fn().mockResolvedValue({ kind: "card_shown" });
    const host = createPlaceholderRestoringHost(
      _createInnerHost({ addDashboardBlock }),
      _createVault(),
    );

    await host.addDashboardBlock!({
      dashboard: "<value 1> deaths",
      block: {
        kind: "DataViz",
        prompt: "Deaths in <value 1>",
        sql: MODEL_SQL,
        vizType: "line",
      },
    });

    expect(addDashboardBlock).toHaveBeenCalledWith({
      dashboard: "Kings deaths",
      block: {
        kind: "DataViz",
        prompt: "Deaths in Kings",
        sql: RESTORED_SQL,
        vizType: "line",
      },
    });
  });

  it("shows a query's summary with the real value in place of its placeholder", async () => {
    const inner = _createInnerHost({});
    const host = createPlaceholderRestoringHost(inner, _createVault());

    await host.showQuery({
      sql: MODEL_SQL,
      summary: "Weekly cases for <value 1>.",
    });

    expect(inner.showQuery).toHaveBeenCalledWith({
      sql: RESTORED_SQL,
      summary: "Weekly cases for Kings.",
    });
  });

  it("shows a question card's text with the real value, and keeps its options masked", async () => {
    const askUser = vi.fn().mockResolvedValue({ kind: "deferred" });
    const host = createPlaceholderRestoringHost(
      _createInnerHost({ askUser }),
      _createVault(),
    );

    await host.askUser({
      question: "Did you mean <value 1> or Queens?",
      options: ["<value 1>", "Queens"],
      isMulti: false,
      kind: "choice",
    });

    // An option the user picks is posted back to the model as their next
    // message without a consent check, so it must stay a placeholder.
    expect(askUser).toHaveBeenCalledWith({
      question: "Did you mean Kings or Queens?",
      options: ["<value 1>", "Queens"],
      isMulti: false,
      kind: "choice",
    });
  });

  it("leaves a placeholder the vault does not hold as written in each text it shows", async () => {
    const inner = _createInnerHost({
      addDashboardBlock: vi.fn().mockResolvedValue({ kind: "card_shown" }),
    });
    const host = createPlaceholderRestoringHost(inner, _createVault());

    await host.showQuery({ sql: MODEL_SQL, summary: "About <value 9>." });
    await host.addDashboardBlock!({
      dashboard: "current",
      block: { kind: "HeadingBlock", text: "About <value 9>.", level: 2 },
    });
    await host.askUser({
      question: "About <value 9>?",
      options: [],
      isMulti: false,
      kind: "choice",
    });

    expect(inner.showQuery).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "About <value 9>." }),
    );
    expect(inner.addDashboardBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ text: "About <value 9>." }),
      }),
    );
    expect(inner.askUser).toHaveBeenCalledWith(
      expect.objectContaining({ question: "About <value 9>?" }),
    );
  });

  it("changes nothing a device turn shows, since its vault holds no value", async () => {
    const inner = _createInnerHost({});
    const host = createPlaceholderRestoringHost(
      inner,
      createSqlPlaceholderVault(),
    );

    await host.showQuery({ sql: "SELECT 1", summary: "Cases for <value 1>." });

    expect(inner.showQuery).toHaveBeenCalledWith({
      sql: "SELECT 1",
      summary: "Cases for <value 1>.",
    });
  });

  it("leaves dashboard members out when the host has none", () => {
    const host = createPlaceholderRestoringHost(
      _createInnerHost({}),
      createSqlPlaceholderVault(),
    );

    expect(host.checkQuery).toBeUndefined();
    expect(host.addDashboardBlock).toBeUndefined();
  });
});
