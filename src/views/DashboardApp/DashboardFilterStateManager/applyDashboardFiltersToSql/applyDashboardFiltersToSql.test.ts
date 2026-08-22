import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

import { describe, expect, it } from "vitest";

import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";

const FILTER_REGION_EQUALS: DashboardFilterRecord = {
  filterId: "region",
  columnName: "region",
  label: "Region",
  operator: "equals",
  value: "EMEA",
};

const FILTER_REGION_IN: DashboardFilterRecord = {
  filterId: "region",
  columnName: "region",
  label: "Region",
  operator: "in",
  value: ["EMEA", "APAC"],
};

const FILTER_NAME_CONTAINS: DashboardFilterRecord = {
  filterId: "name",
  columnName: "name",
  label: "Name",
  operator: "contains",
  value: "ACME",
};

describe("applyDashboardFiltersToSql", () => {
  it("returns the original SQL when no filters are passed", () => {
    expect(
      applyDashboardFiltersToSql({ sql: "SELECT * FROM t", filters: [] }),
    ).toBe("SELECT * FROM t");
  });

  it("returns the original SQL when filters have no values set", () => {
    const empty: DashboardFilterRecord = {
      ...FILTER_REGION_EQUALS,
      value: undefined,
    };
    expect(
      applyDashboardFiltersToSql({
        sql: "SELECT * FROM t",
        filters: [empty],
      }),
    ).toBe("SELECT * FROM t");
  });

  it("wraps SELECT in a subselect with WHERE equals", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t",
      filters: [FILTER_REGION_EQUALS],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "region" = 'EMEA'`,
    );
  });

  it("supports IN with multi-value filters", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t",
      filters: [FILTER_REGION_IN],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "region" IN ('EMEA', 'APAC')`,
    );
  });

  it("supports ILIKE contains", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t",
      filters: [FILTER_NAME_CONTAINS],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "name" ILIKE '%ACME%'`,
    );
  });

  it("AND-combines multiple active filters", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t",
      filters: [FILTER_REGION_EQUALS, FILTER_NAME_CONTAINS],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "region" = 'EMEA' AND "name" ILIKE '%ACME%'`,
    );
  });

  it("trims trailing semicolons before wrapping", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t;",
      filters: [FILTER_REGION_EQUALS],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "region" = 'EMEA'`,
    );
  });

  it("escapes single quotes in literal values", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t",
      filters: [{ ...FILTER_REGION_EQUALS, value: "O'Reilly" }],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "region" = 'O''Reilly'`,
    );
  });

  it("ignores filters not in subscribedFilterIds when whitelisted", () => {
    const result = applyDashboardFiltersToSql({
      sql: "SELECT * FROM t",
      filters: [FILTER_REGION_EQUALS, FILTER_NAME_CONTAINS],
      subscribedFilterIds: ["region"],
    });
    expect(result).toBe(
      `SELECT * FROM (SELECT * FROM t) AS _ava_filtered WHERE "region" = 'EMEA'`,
    );
  });
});
