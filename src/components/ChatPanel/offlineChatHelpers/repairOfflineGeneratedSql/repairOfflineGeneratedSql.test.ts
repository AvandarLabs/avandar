import { describe, expect, it } from "vitest";
import { repairOfflineGeneratedSql } from "@/components/ChatPanel/offlineChatHelpers/repairOfflineGeneratedSql/repairOfflineGeneratedSql";

const DEATHS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const CASES_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

const SCHEMA = {
  datasets: [
    { id: DEATHS_ID, name: "LONG_us_deaths.csv" },
    { id: CASES_ID, name: "LONG_us_confirmed_cases.csv" },
  ],
  columns: [
    {
      dataset_id: DEATHS_ID,
      name: "Country/Region",
      data_type: "string",
    },
    {
      dataset_id: DEATHS_ID,
      name: "Province/State",
      data_type: "string",
    },
    {
      dataset_id: DEATHS_ID,
      name: "daily_new_deaths",
      data_type: "number",
    },
  ],
} as const;

describe("repairOfflineGeneratedSql", () => {
  it("rewrites short table aliases to dataset ids before other repair", () => {
    const result = repairOfflineGeneratedSql({
      sql: 'SELECT * FROM "t0" LIMIT 10',
      schema: SCHEMA,
      lastUserPrompt: "preview rows",
    });

    expect(result.sql).toContain(`FROM "${DEATHS_ID}"`);
    expect(result.sql).not.toContain('"t0"');
    expect(result.appliedSteps).toContain("apply_sql_table_aliases");
  });

  it("remaps covid_deaths and converts TOP to LIMIT", () => {
    const result = repairOfflineGeneratedSql({
      sql: 'SELECT TOP 100 * FROM "covid_deaths"',
      schema: SCHEMA,
      lastUserPrompt: "get top 100 rows from covid deaths dataset",
    });

    expect(result.sql).toContain(`FROM "${DEATHS_ID}"`);
    expect(result.sql.toLowerCase()).toContain("limit 100");
    expect(result.sql).not.toContain("TOP 100");
    expect(result.appliedSteps.length).toBeGreaterThan(0);
  });

  it("replaces pg_database with resolved deaths table", () => {
    const result = repairOfflineGeneratedSql({
      sql: 'SELECT * FROM "pg_database" LIMIT 100',
      schema: SCHEMA,
      lastUserPrompt: "covid deaths top 100",
    });

    expect(result.sql).toContain(`FROM "${DEATHS_ID}"`);
    expect(result.sql).not.toContain("pg_database");
  });

  it("remaps covid_deaths when schema has datasets but no columns", () => {
    const result = repairOfflineGeneratedSql({
      sql: 'SELECT * FROM "covid_deaths" LIMIT 100',
      schema: {
        datasets: [{ id: DEATHS_ID, name: "LONG_us_deaths.csv" }],
        columns: [],
      },
      lastUserPrompt: "get top 100 rows from covid deaths dataset",
    });

    expect(result.sql).toContain(`FROM "${DEATHS_ID}"`);
    expect(result.sql).not.toContain("covid_deaths");
  });

  it("strips schema-qualified table names before dataset remap", () => {
    const result = repairOfflineGeneratedSql({
      sql: 'SELECT * FROM "duckdb_views"."covid_us_deaths" LIMIT 100',
      schema: SCHEMA,
      lastUserPrompt: "get top 100 rows from covid deaths dataset",
    });

    expect(result.sql).toContain(`FROM "${DEATHS_ID}"`);
    expect(result.sql).not.toContain("duckdb_views");
    expect(result.appliedSteps).toContain("strip_table_namespace_qualifiers");
  });

  it("repairs missing country column via alias dictionary", () => {
    const result = repairOfflineGeneratedSql({
      sql: `SELECT * FROM "${DEATHS_ID}" WHERE country = 'NY'`,
      schema: SCHEMA,
      lastUserPrompt: "deaths in NY",
      executionError: 'Binder Error: Referenced column "country" not found',
    });

    expect(result.sql).toContain('"Country/Region"');
    expect(result.sql).not.toContain("WHERE country");
  });
});
