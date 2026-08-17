/**
 * The sanitiser here is a privacy control, not a formatting nicety. DuckDB
 * error messages embed both the submitted SQL and the offending customer
 * value, and `usage_analytics_events.payload` is barred from carrying either.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryAnalyticsPayloads } from "@/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads";

function _setOnline(isOnline: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnline);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QueryAnalyticsPayloads.fromResult", () => {
  it("reports the result size and timing the run itself recorded", () => {
    const payload = QueryAnalyticsPayloads.fromResult({
      trigger: "sql_submit",
      runMetadata: {
        runId: 3,
        durationMs: 128.6,
        outcome: "success",
        didAutoLimit: true,
        rowCount: 42,
        columnCount: 2,
        source: "rawSql",
        dataSourceType: "dataset",
      },
    });

    expect(payload).toEqual({
      trigger: "sql_submit",
      source: "rawSql",
      dataSourceType: "dataset",
      rowCount: 42,
      columnCount: 2,
      durationMs: 129,
      didAutoLimit: true,
    });
  });

  it("rounds a sub-millisecond duration down to zero", () => {
    const payload = QueryAnalyticsPayloads.fromResult({
      trigger: "structured_change",
      runMetadata: {
        runId: 1,
        durationMs: 0.4,
        outcome: "success",
        didAutoLimit: false,
        rowCount: 0,
        columnCount: 0,
        source: "structured",
        dataSourceType: "entity",
      },
    });

    expect(payload.durationMs).toBe(0);
  });
});

describe("QueryAnalyticsPayloads.fromError", () => {
  it("classifies a missing column before a missing table", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Binder Error: Referenced column "revenu" not found in FROM clause!',
      ),
    });

    expect(payload.errorClass).toBe("missing_column");
    expect(payload.surface).toBe("data_explorer");
    expect(payload.trigger).toBe("sql_submit");
    expect(payload.isOffline).toBe(false);
  });

  it("classifies a missing table", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "dashboard_block",
      trigger: "block_render",
      error: new Error("Catalog Error: Table with name orders does not exist!"),
    });

    expect(payload.errorClass).toBe("missing_table");
  });

  it("classifies a missing view, which DuckDB reports as a missing table", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Catalog Error: Table with name v_active_users does not exist!",
      ),
    });

    expect(payload.errorClass).toBe("missing_table");
  });

  it("classifies a qualified reference to a column that does not exist", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Binder Error: Table "t" does not have a column named "ssn"',
      ),
    });

    expect(payload.errorClass).toBe("missing_column");
  });

  it("does not call an ambiguous column reference a missing one", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Binder Error: Ambiguous reference to column name "id" (use: "t.id" or "t2.id")',
      ),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("does not call a missing function a missing table", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Catalog Error: Scalar Function with name lower2 does not exist!",
      ),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("classifies a connection timeout", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new Error("IO Error: Connection to server timed out"),
    });

    expect(payload.errorClass).toBe("timeout");
  });

  it("classifies a parser error as syntax", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error('Parser Error: syntax error at or near "SELCT"'),
    });

    expect(payload.errorClass).toBe("syntax");
  });

  it("classifies a denied read as permission", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "viz_config",
      trigger: "block_render",
      error: new Error("permission denied for table datasets"),
    });

    expect(payload.errorClass).toBe("permission");
  });

  it("classifies a failed fetch as network", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new TypeError("Failed to fetch"),
    });

    expect(payload.errorClass).toBe("network");
  });

  it("classifies anything unrecognised as unknown", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new Error("something went sideways"),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("reports offline first, whatever the message says", () => {
    _setOnline(false);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new Error('Parser Error: syntax error at or near "SELCT"'),
    });

    expect(payload.errorClass).toBe("offline");
    expect(payload.isOffline).toBe(true);
  });

  it("drops the SQL echo DuckDB appends to parser errors", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Parser Error: syntax error at or near "SELCT"\nLINE 1: SELCT ssn FROM patients\n        ^',
      ),
    });

    expect(payload.errorMessage).toBe(
      'Parser Error: syntax error at or near "SELCT"',
    );
    expect(payload.errorMessage).not.toContain("patients");
  });

  it("drops a single-line SQL echo too", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Parser Error: bad token LINE 1: SELECT ssn FROM people",
      ),
    });

    expect(payload.errorMessage).toBe("Parser Error: bad token");
  });

  it("masks quoted customer values", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Conversion Error: Could not convert string 'jane@acme.com' to INT",
      ),
    });

    expect(payload.errorMessage).toBe(
      "Conversion Error: Could not convert string '?' to INT",
    );
  });

  it("masks a quoted value containing an apostrophe, which unbalances naive pairing", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Conversion Error: Could not convert string 'O'Brien' to INT",
      ),
    });

    expect(payload.errorMessage).toBe(
      "Conversion Error: Could not convert string '?' to INT",
    );
    expect(payload.errorMessage).not.toContain("Brien");
  });

  it("masks the value DuckDB puts in a duplicate-key message", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Constraint Error: Duplicate key "email: jane@acme.com" violates unique constraint.',
      ),
    });

    expect(payload.errorMessage).toBe(
      'Constraint Error: Duplicate key "?" violates unique constraint.',
    );
  });

  it("masks the value PostgREST puts in a unique-violation message", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error("Key (email)=(jane@acme.com) already exists."),
    });

    expect(payload.errorMessage).toBe("Key (?)=(?) already exists.");
  });

  it("masks a constraint value whose text contains an apostrophe", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        `Constraint Error: Duplicate key "name: O'Brien" violates unique constraint 'uq_customer_name'`,
      ),
    });

    expect(payload.errorMessage).toBe(
      `Constraint Error: Duplicate key "?" violates unique constraint '?'`,
    );
    expect(payload.errorMessage).not.toContain("Brien");
  });

  it("masks long digit runs that could be an identifier or an account number", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error("Constraint Error: duplicate key 4111111111111111"),
    });

    expect(payload.errorMessage).toBe("Constraint Error: duplicate key ?");
  });

  it("keeps double-quoted identifiers, which are schema rather than data", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error('Binder Error: Referenced column "revenu" not found'),
    });

    expect(payload.errorMessage).toContain('"revenu"');
  });

  it("truncates a very long message to 500 characters", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(`Error: ${"x".repeat(900)}`),
    });

    expect(payload.errorMessage).toHaveLength(500);
  });

  it("handles a thrown non-Error without crashing", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: "just a string",
    });

    expect(payload.errorMessage).toBe("just a string");
    expect(payload.errorClass).toBe("unknown");
  });
});
