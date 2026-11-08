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

/**
 * Builds a one-column table of `Decimal(38, scale)` values from their
 * unscaled integers, as DuckDB stores them: `-4682896n` at scale 6 is
 * `-4.682896`.
 */
function createDecimalTable(
  name: string,
  options: Readonly<{ scale: number; unscaledValues: readonly bigint[] }>,
): arrow.Table<Record<string, arrow.DataType>> {
  const words = new Uint32Array(options.unscaledValues.length * 4);
  options.unscaledValues.forEach((unscaledValue, index) => {
    // Two's complement over 128 bits, little-endian in four 32-bit words.
    let remaining = BigInt.asUintN(128, unscaledValue);
    for (let wordIndex = 0; wordIndex < 4; wordIndex += 1) {
      words[index * 4 + wordIndex] = Number(remaining & 0xffffffffn);
      remaining >>= 32n;
    }
  });
  const column = arrow.makeVector(
    arrow.makeData({
      type: new arrow.Decimal(options.scale, 38, 128),
      length: options.unscaledValues.length,
      nullCount: 0,
      data: words,
    }),
  );
  return createTableFromColumn(name, column);
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

  it("returns a struct inside a list with each field converted as at top level", () => {
    const bucketDate = new Date("2026-01-05");
    const struct = new arrow.Struct([
      new arrow.Field("bucket", new arrow.DateDay(), true),
      new arrow.Field("value", new arrow.Int64(), true),
    ]);
    const series = arrow.vectorFromArray(
      [[{ bucket: bucketDate, value: 3n }]],
      new arrow.List(new arrow.Field("item", struct, true)),
    );
    const topLevelBucket = arrow.vectorFromArray(
      [bucketDate],
      new arrow.DateDay(),
    );

    const [row] = arrowTableToJS(createTableFromColumn("series", series)).data;
    const [topLevelRow] = arrowTableToJS(
      createTableFromColumn("bucket", topLevelBucket),
    ).data;

    expect(row?.series).toEqual([{ bucket: topLevelRow?.bucket, value: 3 }]);
  });

  it("returns a list field of a struct as a plain array", () => {
    const struct = new arrow.Struct([
      new arrow.Field(
        "tags",
        new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
        true,
      ),
      new arrow.Field("count", new arrow.Int64(), true),
    ]);
    const summary = arrow.vectorFromArray(
      [{ tags: ["x", "y"], count: 2n }],
      struct,
    );

    const [row] = arrowTableToJS(
      createTableFromColumn("summary", summary),
    ).data;
    const converted = row?.summary as { tags: unknown; count: unknown };

    expect(Array.isArray(converted.tags)).toBe(true);
    expect(converted).toEqual({ tags: ["x", "y"], count: 2 });
  });

  it("returns a NULL list cell and a NULL list item as null", () => {
    const tags = arrow.vectorFromArray(
      [["blue", null], null],
      new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
    );

    expect(arrowTableToJS(createTableFromColumn("tags", tags)).data).toEqual([
      { tags: ["blue", null] },
      { tags: null },
    ]);
  });

  it("returns a list of lists as nested plain arrays", () => {
    const grid = arrow.vectorFromArray(
      [[[1n], [2n, null]]],
      new arrow.List(
        new arrow.Field(
          "item",
          new arrow.List(new arrow.Field("item", new arrow.Int64(), true)),
          true,
        ),
      ),
    );

    expect(arrowTableToJS(createTableFromColumn("grid", grid)).data).toEqual([
      { grid: [[1], [2, null]] },
    ]);
  });

  it("returns a list of decimals as plain numbers", () => {
    const decimalType = new arrow.Decimal(0, 18, 128);
    const child = arrow.makeData({
      type: decimalType,
      length: 1,
      nullCount: 0,
      data: new Uint32Array([12345, 0, 0, 0]),
    });
    const prices = arrow.makeVector(
      arrow.makeData({
        type: new arrow.List(new arrow.Field("item", decimalType, true)),
        length: 1,
        nullCount: 0,
        valueOffsets: new Int32Array([0, 1]),
        child,
      }),
    );

    expect(
      arrowTableToJS(createTableFromColumn("prices", prices)).data,
    ).toEqual([{ prices: [12345] }]);
  });

  it("returns a top-level decimal with its scale applied", () => {
    // 2.25 stored as the unscaled integer 225 under scale 2.
    const price = arrow.makeVector(
      arrow.makeData({
        type: new arrow.Decimal(2, 4, 128),
        length: 2,
        nullCount: 0,
        data: new Uint32Array([225, 0, 0, 0, 5, 0, 0, 0]),
      }),
    );

    expect(arrowTableToJS(createTableFromColumn("price", price)).data).toEqual([
      { price: 2.25 },
      { price: 0.05 },
    ]);
  });

  it("returns a decimal inside a list with its scale applied", () => {
    const decimalType = new arrow.Decimal(2, 4, 128);
    const child = arrow.makeData({
      type: decimalType,
      length: 1,
      nullCount: 0,
      data: new Uint32Array([225, 0, 0, 0]),
    });
    const prices = arrow.makeVector(
      arrow.makeData({
        type: new arrow.List(new arrow.Field("item", decimalType, true)),
        length: 1,
        nullCount: 0,
        valueOffsets: new Int32Array([0, 1]),
        child,
      }),
    );

    expect(
      arrowTableToJS(createTableFromColumn("prices", prices)).data,
    ).toEqual([{ prices: [2.25] }]);
  });

  // Adding the decimal's high and low halves as floats leaves this one a
  // float step off, as -4.6828959999999995.
  it("returns a negative decimal at scale 6 as the exact nearest number", () => {
    const table = createDecimalTable("balance", {
      scale: 6,
      unscaledValues: [-4682896n],
    });

    expect(arrowTableToJS(table).data).toEqual([{ balance: -4.682896 }]);
  });

  it("returns a decimal whose whole part exceeds 2^53 as the nearest number", () => {
    const table = createDecimalTable("total", {
      scale: 2,
      unscaledValues: [12345678901234567890123n],
    });

    expect(arrowTableToJS(table).data).toEqual([
      { total: Number("123456789012345678901.23") },
    ]);
  });
});
