/**
 * Runs the agent's tools through the placeholder-restoring host against a
 * real DuckDB, so the checks cover what DuckDB itself sends back: column
 * names it builds from the restored SQL, and case-sensitive matching.
 */
import { describe, expect, it, vi } from "vitest";
import { createLookupValuesTool } from "@/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool";
import { createRunQueryTool } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { createDataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import { createPlaceholderRestoringHost } from "@/lib/agent/dataAgent/pagePrivacy/createPlaceholderRestoringHost";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { DuckDBConnection } from "@duckdb/node-api";

const TABLE = "0b1c2d3e-1111-4111-8111-aaaaaaaaaaaa";

const ALIASES = [
  { alias: "t0", tableName: TABLE, kind: "dataset", datasetId: TABLE },
] as unknown as SqlTableAlias.T[];

/** A vault holding `'Jane Doe'` as `<value 1>`, from a chart's filter. */
function _createVault(): ReturnType<typeof createSqlPlaceholderVault> {
  const vault = createSqlPlaceholderVault();
  vault.redact(`SELECT * FROM "${TABLE}" WHERE "patient_name" = 'Jane Doe'`, {
    isSensitiveColumn: (columnName) => {
      return columnName === "patient_name";
    },
    isSensitiveValue: () => {
      return false;
    },
  });
  return vault;
}

/** A host whose queries and lookups run in `connection`. */
function _createDuckDbHost(connection: DuckDBConnection): DataAgentHost {
  return {
    showQuery: async (request) => {
      try {
        const reader = await connection.runAndReadAll(request.sql);
        return {
          kind: "rows",
          columns: reader.columnNames().map((name) => {
            return { name, type: "unknown" };
          }),
          rowCount: reader.getRows().length,
        };
      } catch (error) {
        return { kind: "failed", error: String(error) };
      }
    },
    readColumnValues: vi.fn(async (sql: string) => {
      const reader = await connection.runAndReadAll(sql);
      return reader.getRows().map((row) => {
        return String(row[0]);
      });
    }),
    askUser: vi.fn(async () => {
      return { kind: "dismissed" as const };
    }),
    approveValuesForModel: async () => {
      return true;
    },
  };
}

async function _createPatients(connection: DuckDBConnection): Promise<void> {
  await connection.run(
    `CREATE TABLE "${TABLE}" AS SELECT * FROM (VALUES ('Jane Doe', 1), ('John Roe', 2)) v("patient_name", n)`,
  );
}

describe("placeholder round trip in DuckDB", () => {
  it.each([
    `SELECT count(*) FILTER (WHERE "patient_name" = '<value 1>') FROM "t0"`,
    `SELECT sum(CASE WHEN "patient_name" = '<value 1>' THEN n END) FROM "t0"`,
    `SELECT "patient_name" = '<value 1>', count(*) FROM "t0" GROUP BY 1`,
  ])("keeps the value out of run_query's result: %s", async (sql) => {
    await withDuckDb(async (connection) => {
      await _createPatients(connection);
      const tool = createRunQueryTool({
        host: createPlaceholderRestoringHost(
          _createDuckDbHost(connection),
          _createVault(),
        ),
        aliases: ALIASES,
        state: createDataAgentRunState(),
      });

      const result = await tool.execute("call-1", { sql, summary: "s" });

      expect(JSON.stringify(result.content)).toContain("<value 1>");
      expect(JSON.stringify(result)).not.toContain("Jane");
    });
  });

  it.each([
    ["the placeholder quoted", "'<value 1>'", []],
    ["the placeholder in capitals", "<VALUE 1>", []],
    ["the placeholder with spaces", " <value  1> ", []],
    ["a form that is the placeholder", "Jane", ["<value 1>"]],
  ])("treats %s as the stored placeholder", async (_label, named, forms) => {
    await withDuckDb(async (connection) => {
      await _createPatients(connection);
      const inner = _createDuckDbHost(connection);
      const tool = createLookupValuesTool({
        host: createPlaceholderRestoringHost(inner, _createVault()),
        aliases: ALIASES,
        state: createDataAgentRunState(),
      });

      const result = await tool.execute("call-1", {
        table: "t0",
        column: "patient_name",
        values: [{ named, forms }],
        question: "Which patient?",
      });

      expect(JSON.stringify(result.content)).toContain(
        '\\"<value 1>\\" is stored as \\"<value 1>\\"',
      );
      expect(inner.readColumnValues).not.toHaveBeenCalled();
      expect(inner.askUser).not.toHaveBeenCalled();
    });
  });

  it("answers an unknown placeholder with an error, not a card", async () => {
    await withDuckDb(async (connection) => {
      await _createPatients(connection);
      const inner = _createDuckDbHost(connection);
      const tool = createLookupValuesTool({
        host: createPlaceholderRestoringHost(inner, _createVault()),
        aliases: ALIASES,
        state: createDataAgentRunState(),
      });

      const result = await tool.execute("call-1", {
        table: "t0",
        column: "patient_name",
        values: [{ named: "<value 9>", forms: [] }],
        question: "Which patient?",
      });

      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain("unknown placeholder");
      expect(inner.readColumnValues).not.toHaveBeenCalled();
      expect(inner.askUser).not.toHaveBeenCalled();
    });
  });

  it("treats a held placeholder as a stored value without a lookup", async () => {
    await withDuckDb(async (connection) => {
      await _createPatients(connection);
      const inner = _createDuckDbHost(connection);
      const tool = createLookupValuesTool({
        host: createPlaceholderRestoringHost(inner, _createVault()),
        aliases: ALIASES,
        state: createDataAgentRunState(),
      });

      const result = await tool.execute("call-1", {
        table: "t0",
        column: "patient_name",
        values: [{ named: "<value 1>", forms: [] }],
        question: "Which patient?",
      });

      expect(JSON.stringify(result.content)).toContain(
        '\\"<value 1>\\" is stored as \\"<value 1>\\"',
      );
      expect(inner.readColumnValues).not.toHaveBeenCalled();
      expect(inner.askUser).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain("Jane");
    });
  });
});
