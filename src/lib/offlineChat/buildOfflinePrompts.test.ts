import { describe, expect, it } from "vitest";
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import {
  buildOfflineAnalyzePrompt,
  buildOfflineFixSqlPrompt,
  buildOfflineSqlPrompt,
} from "./buildOfflinePrompts";

const DEATHS_TABLE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const SCHEMA = {
  datasets: [{ id: DEATHS_TABLE_ID, name: "LONG_us_deaths.csv" }],
  columns: [
    {
      dataset_id: DEATHS_TABLE_ID,
      name: "Province/State",
      data_type: "string",
    },
  ],
} as const;

describe("buildOfflineSqlPrompt", () => {
  it("requires resolved dataset FROM and SQL-only output", () => {
    const prompt = buildOfflineSqlPrompt({
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext({
        openDatasetId: DEATHS_TABLE_ID,
      }),
      analysisSummary: "Filter rows",
      lastUserPrompt: "covid deaths top 100",
      resolvedDataset: {
        id: DEATHS_TABLE_ID,
        name: "LONG_us_deaths.csv",
      },
    });

    expect(prompt).toContain(`Required: use FROM "${DEATHS_TABLE_ID}"`);
    expect(prompt).toContain("Output ONLY");
    expect(prompt).toContain("LIMIT, not SELECT TOP");
  });
});

describe("buildOfflineFixSqlPrompt", () => {
  it("lists allowed table names and forbids system catalogs", () => {
    const prompt = buildOfflineFixSqlPrompt({
      schema: SCHEMA,
      sql: 'SELECT * FROM "pg_database"',
      error: "Table does not exist",
      lastUserPrompt: "deaths",
      resolvedDataset: {
        id: DEATHS_TABLE_ID,
        name: "LONG_us_deaths.csv",
      },
    });

    expect(prompt).toContain("Allowed table names");
    expect(prompt).toContain("pg_database");
    expect(prompt).toContain(DEATHS_TABLE_ID);
  });
});

describe("buildOfflineAnalyzePrompt", () => {
  it("includes optional tableName in JSON shape", () => {
    const prompt = buildOfflineAnalyzePrompt({
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      lastUserPrompt: "deaths",
    });

    expect(prompt).toContain('"tableName"');
  });
});
