/**
 * Round-trip tests for the concept spine's CSV writer.
 *
 * These assert against a real CSV parser rather than against the emitted text.
 * A string assertion only proves the writer matches the author's idea of RFC
 * 4180; reading the values back through DuckDB proves the loader agrees, which
 * is the property that matters. An `external_id` that does not survive the
 * round trip silently drops or merges individuals, so the spine's grain depends
 * on this.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toCsvColumn } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvColumn";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";

/**
 * Writes the CSV, reads it back through DuckDB, returns the column values.
 *
 * The return type admits `null` on purpose: DuckDB's CSV reader maps a quoted
 * empty field to NULL rather than to an empty string, so an empty input is not
 * representable. Typing this as `string[]` would hide that.
 */
async function _roundTrip(
  values: readonly string[],
): Promise<Array<string | null>> {
  const csvText = toCsvColumn("external_id", values);
  const path = join(
    tmpdir(),
    `ava-spine-${values.length}-${csvText.length}.csv`,
  );
  writeFileSync(path, csvText, "utf8");

  return await withDuckDb(async (connection) => {
    const reader = await connection.runAndReadAll(
      `SELECT external_id FROM read_csv('${path}', header = true, all_varchar = true)`,
    );
    return reader.getRowObjects().map((row) => {
      return row.external_id === null ? null : String(row.external_id);
    });
  });
}

describe("toCsvColumn", () => {
  it("round-trips an id containing a single quote", async () => {
    await expect(_roundTrip(["O'Brien"])).resolves.toEqual(["O'Brien"]);
  });

  it("round-trips an id containing a comma", async () => {
    await expect(_roundTrip(["Brien, O"])).resolves.toEqual(["Brien, O"]);
  });

  it("round-trips an id containing a double quote", async () => {
    await expect(_roundTrip(['say "hi"'])).resolves.toEqual(['say "hi"']);
  });

  it("round-trips an id containing a newline", async () => {
    await expect(_roundTrip(["line1\nline2"])).resolves.toEqual([
      "line1\nline2",
    ]);
  });

  // The row count is the grain claim: N individuals in must be N rows out. A
  // quoting bug shows up here as a merged or split row rather than as a wrong
  // string, and that is the failure that would corrupt a concept's grain.
  it("preserves the row count and order across awkward ids", async () => {
    const ids = ["plain", "O'Brien", "Brien, O", 'say "hi"', "a\nb"];

    const readBack = await _roundTrip(ids);

    expect(readBack).toHaveLength(ids.length);
    expect(readBack).toEqual(ids);
  });

  // A known limitation, asserted rather than hidden. Quoting the empty field is
  // still required: written bare it produces a blank line that DuckDB skips
  // entirely, which drops the row and corrupts the grain. Quoted, the row
  // survives but the value arrives as NULL, because DuckDB's CSV reader maps a
  // quoted empty field to NULL.
  //
  // The row surviving is what matters here; a NULL key simply matches no
  // contributing dataset row, so every attribute comes back NULL. Rejecting an
  // empty `external_id` belongs to the spine builder, which can fail loudly,
  // rather than to a CSV writer that has no idea what the column means.
  it("keeps the row for an empty id but cannot preserve its value", async () => {
    const readBack = await _roundTrip(["before", "", "after"]);

    expect(readBack).toEqual(["before", null, "after"]);
  });
});
