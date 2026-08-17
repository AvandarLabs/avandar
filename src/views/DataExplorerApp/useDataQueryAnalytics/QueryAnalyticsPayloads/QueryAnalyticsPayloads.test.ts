/**
 * The sanitiser here is a privacy control, not a formatting nicety. DuckDB
 * error messages embed both the submitted SQL and the offending customer
 * value, and `usage_analytics_events.payload` is barred from carrying either.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryAnalyticsPayloads } from "@/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads";
import type { DataQueryRunMetadata } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";

/**
 * A failed run as the query function records it. `isOffline` is captured in
 * the `catch`, not read at emit time, so it is part of the fixture.
 */
function _failedRun(
  error: unknown,
  options: Readonly<{
    trigger?: DataQueryRunMetadata["trigger"];
    isOffline?: boolean;
  }> = {},
): Extract<DataQueryRunMetadata, { outcome: "error" }> {
  return {
    runId: 1,
    durationMs: 10,
    source: "rawSql",
    dataSourceType: "dataset",
    trigger: options.trigger ?? "sql_submit",
    outcome: "error",
    error,
    isOffline: options.isOffline ?? false,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QueryAnalyticsPayloads.fromResult", () => {
  it("reports the result size and timing the run itself recorded", () => {
    const payload = QueryAnalyticsPayloads.fromResult({
      runMetadata: {
        trigger: "sql_submit",
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
      runMetadata: {
        trigger: "structured_change",
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
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          'Binder Error: Referenced column "revenu" not found in FROM clause!',
        ),
      ),
    });

    expect(payload.errorClass).toBe("missing_column");
    expect(payload.surface).toBe("data_explorer");
    expect(payload.trigger).toBe("sql_submit");
    expect(payload.isOffline).toBe(false);
  });

  it("classifies a missing table", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "dashboard_block",
      runMetadata: _failedRun(
        new Error("Catalog Error: Table with name orders does not exist!"),
        { trigger: "block_render" },
      ),
    });

    expect(payload.errorClass).toBe("missing_table");
  });

  it("classifies a missing view, which DuckDB reports as a missing table", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          "Catalog Error: Table with name v_active_users does not exist!",
        ),
      ),
    });

    expect(payload.errorClass).toBe("missing_table");
  });

  it("classifies a qualified reference to a column that does not exist", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error('Binder Error: Table "t" does not have a column named "ssn"'),
      ),
    });

    expect(payload.errorClass).toBe("missing_column");
  });

  it("does not call an ambiguous column reference a missing one", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          'Binder Error: Ambiguous reference to column name "id" (use: "t.id" or "t2.id")',
        ),
      ),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("does not call a missing function a missing table", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          "Catalog Error: Scalar Function with name lower2 does not exist!",
        ),
      ),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("classifies a connection timeout", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error("IO Error: Connection to server timed out"),
        { trigger: "structured_change" },
      ),
    });

    expect(payload.errorClass).toBe("timeout");
  });

  it("classifies a parser error as syntax", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error('Parser Error: syntax error at or near "SELCT"'),
      ),
    });

    expect(payload.errorClass).toBe("syntax");
  });

  it("classifies a denied read as permission", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "viz_config",
      runMetadata: _failedRun(
        new Error("permission denied for table datasets"),
        { trigger: "block_render" },
      ),
    });

    expect(payload.errorClass).toBe("permission");
  });

  it("classifies a failed fetch as network", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(new TypeError("Failed to fetch"), {
        trigger: "structured_change",
      }),
    });

    expect(payload.errorClass).toBe("network");
  });

  it("classifies anything unrecognised as unknown", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(new Error("something went sideways"), {
        trigger: "structured_change",
      }),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("reports offline first, whatever the message says", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      // A message that a rule would otherwise claim, recorded while offline.
      // Both rules match this fixture, so the assertion pins which one wins.
      runMetadata: _failedRun(
        new Error('Parser Error: syntax error at or near "SELCT"'),
        { trigger: "structured_change", isOffline: true },
      ),
    });

    expect(payload.errorClass).toBe("offline");
    expect(payload.isOffline).toBe(true);
  });

  it("drops the SQL echo DuckDB appends to parser errors", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          'Parser Error: syntax error at or near "SELCT"\nLINE 1: SELCT ssn FROM patients\n        ^',
        ),
      ),
    });

    expect(payload.errorMessage).toBe(
      'Parser Error: syntax error at or near "SELCT"',
    );
    expect(payload.errorMessage).not.toContain("patients");
  });

  it("drops a single-line SQL echo too", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error("Parser Error: bad token LINE 1: SELECT ssn FROM people"),
      ),
    });

    expect(payload.errorMessage).toBe("Parser Error: bad token");
  });

  it("masks quoted customer values", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          "Conversion Error: Could not convert string 'jane@acme.com' to INT",
        ),
      ),
    });

    expect(payload.errorMessage).toBe(
      "Conversion Error: Could not convert string '?' to INT",
    );
  });

  it("masks a quoted value containing an apostrophe, which unbalances naive pairing", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          "Conversion Error: Could not convert string 'O'Brien' to INT",
        ),
      ),
    });

    expect(payload.errorMessage).toBe(
      "Conversion Error: Could not convert string '?' to INT",
    );
    expect(payload.errorMessage).not.toContain("Brien");
  });

  it("masks the value DuckDB puts in a duplicate-key message", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          'Constraint Error: Duplicate key "email: jane@acme.com" violates unique constraint.',
        ),
      ),
    });

    expect(payload.errorMessage).toBe(
      'Constraint Error: Duplicate key "?" violates unique constraint.',
    );
  });

  it("masks the value PostgREST puts in a unique-violation message", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error("Key (email)=(jane@acme.com) already exists."),
      ),
    });

    expect(payload.errorMessage).toBe("Key (?)=(?) already exists.");
  });

  it("masks a parenthesised value that itself contains an apostrophe", () => {
    // Pins the parenthesis half of the mask ordering. Under the reversed
    // order the greedy single-quote mask eats the closing paren first, so the
    // parenthesis rule stops matching and the customer value survives.
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          "Constraint Error: Key (name)=(O'Brien) violates unique constraint 'uq_name'",
        ),
      ),
    });

    expect(payload.errorMessage).not.toContain("O'Brien");
    expect(payload.errorMessage).not.toContain("Brien");
  });

  it("masks a constraint value whose text contains an apostrophe", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error(
          `Constraint Error: Duplicate key "name: O'Brien" violates unique constraint 'uq_customer_name'`,
        ),
      ),
    });

    expect(payload.errorMessage).toBe(
      `Constraint Error: Duplicate key "?" violates unique constraint '?'`,
    );
    expect(payload.errorMessage).not.toContain("Brien");
  });

  it("masks long digit runs that could be an identifier or an account number", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error("Constraint Error: duplicate key 4111111111111111"),
      ),
    });

    expect(payload.errorMessage).toBe("Constraint Error: duplicate key ?");
  });

  it("keeps double-quoted identifiers, which are schema rather than data", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(
        new Error('Binder Error: Referenced column "revenu" not found'),
      ),
    });

    expect(payload.errorMessage).toContain('"revenu"');
  });

  it("truncates a very long message to 500 characters", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun(new Error(`Error: ${"x".repeat(900)}`)),
    });

    expect(payload.errorMessage).toHaveLength(500);
  });

  it("handles a thrown non-Error without crashing", () => {
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      runMetadata: _failedRun("just a string"),
    });

    expect(payload.errorMessage).toBe("just a string");
    expect(payload.errorClass).toBe("unknown");
  });
});
