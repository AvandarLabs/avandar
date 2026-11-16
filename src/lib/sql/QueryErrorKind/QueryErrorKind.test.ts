import { describe, expect, it } from "vitest";
import { QueryErrorKind } from "@/lib/sql/QueryErrorKind/QueryErrorKind";

const DATASET_ID = "86440223-249d-4b3d-9be4-159a4e615e0a";

describe("QueryErrorKind.fromMessage", () => {
  it("names the missing column from a binder error", () => {
    expect(
      QueryErrorKind.fromMessage(
        'Binder Error: Referenced column "deaths" not found in FROM clause!\nCandidate bindings: "daily_new_deaths"\n\nLINE 1: select deaths from t\n               ^',
      ),
    ).toEqual({ kind: "missing_column", columnName: "deaths" });
  });

  it("reads a missing table without exposing the dataset id", () => {
    expect(
      QueryErrorKind.fromMessage(
        `Catalog Error: Table with name ${DATASET_ID} does not exist!\nDid you mean "pg_enum"?`,
      ),
    ).toEqual({ kind: "missing_table" });
  });

  it("names the missing function", () => {
    expect(
      QueryErrorKind.fromMessage(
        'Catalog Error: Scalar Function with name made_up_fn does not exist!\nDid you mean "mad"?',
      ),
    ).toEqual({ kind: "missing_function", functionName: "made_up_fn" });
  });

  it("reads type mismatches and failed conversions as mismatched values", () => {
    expect(
      QueryErrorKind.fromMessage(
        "Binder Error: No function matches the given name and argument types 'date_part(STRING_LITERAL, VARCHAR)'. You might need to add explicit type casts.",
      ),
    ).toEqual({ kind: "mismatched_values" });
    expect(
      QueryErrorKind.fromMessage(
        "Conversion Error: Could not convert string 'a' to INT32 when casting from source column s",
      ),
    ).toEqual({ kind: "mismatched_values" });
  });

  it("reads a GROUP BY binder error as a grouping problem", () => {
    expect(
      QueryErrorKind.fromMessage(
        'Binder Error: column "s" must appear in the GROUP BY clause or must be part of an aggregate function.',
      ),
    ).toEqual({ kind: "grouping" });
  });

  it("reads parser errors as syntax errors", () => {
    expect(
      QueryErrorKind.fromMessage(
        'Parser Error: syntax error at or near "where"',
      ),
    ).toEqual({ kind: "syntax" });
  });

  it("reads the safety analyzer's refusals as blocked queries", () => {
    expect(
      QueryErrorKind.fromMessage(
        "Cannot safely analyze DuckDB SQL: uninspectable-source",
      ),
    ).toEqual({ kind: "blocked" });
    expect(
      QueryErrorKind.fromMessage(
        "Cannot safely execute DuckDB SQL: dynamic-query",
      ),
    ).toEqual({ kind: "blocked" });
  });

  it("reads memory exhaustion and interruptions", () => {
    expect(
      QueryErrorKind.fromMessage(
        "Out of Memory Error: failed to allocate data of size 256.0 MiB",
      ),
    ).toEqual({ kind: "out_of_memory" });
    expect(QueryErrorKind.fromMessage("INTERRUPT Error: Interrupted!")).toEqual(
      { kind: "cancelled" },
    );
  });

  it("falls back to unknown for anything else", () => {
    expect(QueryErrorKind.fromMessage("Something odd happened")).toEqual({
      kind: "unknown",
    });
  });
});

describe("QueryErrorKind.toTechnicalDetails", () => {
  it("drops the caret diagram and swaps dataset ids for a placeholder", () => {
    expect(
      QueryErrorKind.toTechnicalDetails(
        `Catalog Error: Table with name ${DATASET_ID} does not exist!\n\nLINE 1: select * from "${DATASET_ID}"\n               ^`,
      ),
    ).toBe("Catalog Error: Table with name <dataset> does not exist!");
  });
});
