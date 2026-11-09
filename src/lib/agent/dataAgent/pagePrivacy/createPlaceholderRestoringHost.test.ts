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
