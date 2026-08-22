/**
 * Pins that column projection is a bare SELECT: same rows, same order, no
 * DISTINCT.
 */

import { describe, expect, it } from "vitest";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";

describe("projectParquetBlob row-order contract", () => {
  it("keeps row count and order when projecting two of three columns", async () => {
    await withDuckDb(async (connection) => {
      await connection.run(
        "CREATE TABLE src AS SELECT * FROM (VALUES (1, 'x', 'a'), (1, 'x', 'b'), (2, 'y', 'c')) t(id, label, extra)",
      );
      await connection.run(
        "CREATE TABLE projected AS SELECT id, label FROM src",
      );
      const source = await connection.runAndReadAll(
        "SELECT id, label FROM src",
      );
      const projected = await connection.runAndReadAll(
        "SELECT * FROM projected",
      );
      expect(projected.getRowObjects()).toEqual(source.getRowObjects());
      expect(projected.getRowObjects()).toHaveLength(3);
      expect(Object.keys(projected.getRowObjects()[0] ?? {}).sort()).toEqual([
        "id",
        "label",
      ]);
    });
  });
});
