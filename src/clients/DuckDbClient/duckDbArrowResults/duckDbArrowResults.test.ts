import * as arrow from "apache-arrow";
import { describe, expect, it } from "vitest";
import { arrowTableToJS } from "@/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults";

/** Builds a one-column Arrow table, typed as `arrowTableToJS` accepts it. */
function createTableFromColumn(
  name: string,
  column: arrow.Vector,
): arrow.Table<Record<string, arrow.DataType>> {
  return new arrow.Table({ [name]: column });
}

describe("arrowTableToJS", () => {
  // A list of text holds plain strings, which have no `toJSON`.
  it("returns a list of text as a plain array of strings", () => {
    const tags = arrow.vectorFromArray(
      [["blue", "green"], []],
      new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
    );

    expect(arrowTableToJS(createTableFromColumn("tags", tags)).data).toEqual([
      { tags: ["blue", "green"] },
      { tags: [] },
    ]);
  });

  it("returns a list of 64-bit integers as plain numbers", () => {
    const doses = arrow.vectorFromArray(
      [[1n, 2n]],
      new arrow.List(new arrow.Field("item", new arrow.Int64(), true)),
    );

    expect(arrowTableToJS(createTableFromColumn("doses", doses)).data).toEqual([
      { doses: [1, 2] },
    ]);
  });
});
