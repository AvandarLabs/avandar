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
});
