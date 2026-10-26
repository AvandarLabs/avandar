/**
 * Round-trip tests for the concept spine's multi-column CSV writer.
 *
 * Like `toCsvColumn`'s, these read the text back through DuckDB rather than
 * asserting it: the spine's grain and every record's status depend on the
 * loader agreeing with the writer, not on the writer matching an idea of
 * RFC 4180.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toCsvRows } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvRows";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";

/** Writes the CSV, reads it back through DuckDB, returns the rows. */
async function _roundTrip(
  rows: ReadonlyArray<readonly string[]>,
): Promise<Array<[string | null, string | null]>> {
  const csvText = toCsvRows({ columnNames: ["external_id", "status"], rows });
  const path = join(
    tmpdir(),
    `ava-spine-rows-${rows.length}-${csvText.length}.csv`,
  );
  writeFileSync(path, csvText, "utf8");

  return await withDuckDb(async (connection) => {
    const reader = await connection.runAndReadAll(
      `SELECT external_id, status FROM read_csv('${path}', header = true, all_varchar = true)`,
    );
    return reader.getRowObjects().map((row) => {
      return [
        row.external_id === null ? null : String(row.external_id),
        row.status === null ? null : String(row.status),
      ];
    });
  });
}

describe("toCsvRows", () => {
  it("round-trips a status containing a comma beside its id", async () => {
    await expect(_roundTrip([["p1", "Closed, no action"]])).resolves.toEqual([
      ["p1", "Closed, no action"],
    ]);
  });

  it("round-trips quotes and newlines in either column", async () => {
    await expect(_roundTrip([['say "hi"', "line1\nline2"]])).resolves.toEqual([
      ['say "hi"', "line1\nline2"],
    ]);
  });

  // The grain claim: N records in must be N rows out, in order.
  it("preserves the row count and order across awkward values", async () => {
    const rows = [
      ["plain", "Active"],
      ["O'Brien", "Ruled out"],
      ["Brien, O", "Closed, no action"],
      ["a\nb", 'Re-"opened"'],
    ];

    await expect(_roundTrip(rows)).resolves.toEqual(rows);
  });
});
