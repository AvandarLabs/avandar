import { describe, expect, it } from "vitest";
import { resolveAxisScale } from "@/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale";
import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

const EXTENT = { min: 0, max: 100 };

describe("resolveAxisScale — no configuration", () => {
  it("returns nothing when the axis is undefined", () => {
    expect(resolveAxisScale(undefined, EXTENT)).toEqual({});
  });

  it("returns nothing when only cosmetic settings are present", () => {
    // Typed as a full `AxisStyle` because that is what callers hand in:
    // the scale resolver only reads the scale fields, but the object it
    // receives carries the cosmetic ones too.
    const cosmeticOnly: AxisStyle = { label: "Revenue" };
    expect(resolveAxisScale(cosmeticOnly, EXTENT)).toEqual({});
  });
});

describe("resolveAxisScale — bounds without an interval", () => {
  it("uses both explicit bounds and clips data to them", () => {
    expect(resolveAxisScale({ min: 10, max: 90 }, EXTENT)).toEqual({
      domain: [10, 90],
      allowDataOverflow: true,
    });
  });

  it("zero-anchors a derived minimum for non-negative data", () => {
    expect(resolveAxisScale({ max: 90 }, { min: 20, max: 100 })).toEqual({
      domain: [0, 90],
      allowDataOverflow: true,
    });
  });

  it("uses the data minimum when the data goes negative", () => {
    expect(resolveAxisScale({ max: 90 }, { min: -30, max: 100 })).toEqual({
      domain: [-30, 90],
      allowDataOverflow: true,
    });
  });

  it("derives the maximum from the data when only a minimum is set", () => {
    expect(resolveAxisScale({ min: 10 }, EXTENT)).toEqual({
      domain: [10, 100],
      allowDataOverflow: true,
    });
  });

  it("falls back to auto when there is no extent to derive from", () => {
    expect(resolveAxisScale({ min: 10 }, undefined)).toEqual({
      domain: [10, "auto"],
      allowDataOverflow: true,
    });
  });
});

describe("resolveAxisScale — tick interval", () => {
  it("generates the motivating chart's ticks", () => {
    expect(
      resolveAxisScale(
        { min: 0, max: 120000, tickInterval: 24000 },
        { min: 0, max: 118000 },
      ),
    ).toEqual({
      domain: [0, 120000],
      ticks: [0, 24000, 48000, 72000, 96000, 120000],
      allowDataOverflow: true,
    });
  });

  it("works from the interval alone by deriving both bounds", () => {
    const result = resolveAxisScale({ tickInterval: 25 }, { min: 0, max: 90 });
    expect(result).toEqual({
      domain: [0, 100],
      ticks: [0, 25, 50, 75, 100],
    });
  });

  it("anchors the tick lattice at an explicit non-aligned minimum", () => {
    expect(
      resolveAxisScale(
        { min: 1000, tickInterval: 24000 },
        { min: 0, max: 50000 },
      ),
    ).toEqual({
      domain: [1000, 73000],
      ticks: [1000, 25000, 49000, 73000],
      allowDataOverflow: true,
    });
  });

  it("truncates the last tick when an explicit maximum falls between ticks", () => {
    expect(
      resolveAxisScale(
        { min: 0, max: 100000, tickInterval: 24000 },
        { min: 0, max: 100000 },
      ),
    ).toEqual({
      domain: [0, 100000],
      ticks: [0, 24000, 48000, 72000, 96000],
      allowDataOverflow: true,
    });
  });

  it("does not set allowDataOverflow when both bounds are derived", () => {
    const result = resolveAxisScale({ tickInterval: 25 }, { min: 0, max: 90 });
    expect(result.allowDataOverflow).toBeUndefined();
  });

  it("drops ticks but keeps the domain when the count exceeds the cap", () => {
    const result = resolveAxisScale(
      { min: 0, max: 1_000_000, tickInterval: 1 },
      { min: 0, max: 1_000_000 },
    );
    expect(result.ticks).toBeUndefined();
    expect(result.domain).toEqual([0, 1_000_000]);
  });

  it("survives a fractional interval without floating point drift", () => {
    const result = resolveAxisScale(
      { min: 0, max: 1, tickInterval: 0.1 },
      { min: 0, max: 1 },
    );
    expect(result.ticks).toHaveLength(11);
  });

  it("keeps the final tick when the division lands just under a whole step", () => {
    // `(0.3 - 0) / 0.1` is `2.9999999999999996`, so without
    // TICK_COUNT_EPSILON this lattice silently loses its endpoint.
    // The 0-to-1 case above does not exercise the epsilon: `1 / 0.1` is
    // exactly `10` in IEEE754.
    const result = resolveAxisScale(
      { min: 0, max: 0.3, tickInterval: 0.1 },
      { min: 0, max: 0.3 },
    );
    expect(result.ticks).toHaveLength(4);
  });

  it("ignores an interval wider than the data when the high bound is derived", () => {
    // The lattice would otherwise extend a full interval past the data
    // and squash every mark into a sliver.
    expect(
      resolveAxisScale({ tickInterval: 1_000_000 }, { min: 0, max: 100 }),
    ).toEqual({ domain: [0, 100] });
  });

  it("ignores a data-unit interval typed onto a percent axis", () => {
    // A percent-stacked chart's real domain is 0-to-1 while its ticks
    // read as percentages, so a user may enter 20 meaning 20%.
    expect(resolveAxisScale({ tickInterval: 20 }, { min: 0, max: 1 })).toEqual({
      domain: [0, 1],
    });
  });

  it("still builds a lattice when the interval equals the data range", () => {
    expect(
      resolveAxisScale({ tickInterval: 100 }, { min: 0, max: 100 }),
    ).toEqual({ domain: [0, 100], ticks: [0, 100] });
  });

  it("honours an oversized interval when the user set the maximum", () => {
    // Both bounds explicit means the domain is the user's choice.
    expect(
      resolveAxisScale(
        { min: 0, max: 1_000_000, tickInterval: 1_000_000 },
        { min: 0, max: 100 },
      ),
    ).toEqual({
      domain: [0, 1_000_000],
      ticks: [0, 1_000_000],
      allowDataOverflow: true,
    });
  });

  it("drops a lattice that would hold a single tick", () => {
    // An explicit maximum closer to the minimum than one interval step
    // yields just the origin. Recharts picks better ticks than that.
    const result = resolveAxisScale(
      { min: 0, max: 100, tickInterval: 1_000_000 },
      { min: 0, max: 100 },
    );
    expect(result.ticks).toBeUndefined();
    expect(result.domain).toEqual([0, 100]);
  });
});

describe("resolveAxisScale — guards", () => {
  it("ignores an inverted explicit range", () => {
    expect(resolveAxisScale({ min: 100, max: 10 }, EXTENT)).toEqual({});
  });

  it("ignores an equal explicit range", () => {
    expect(resolveAxisScale({ min: 50, max: 50 }, EXTENT)).toEqual({});
  });

  it("ignores a zero interval", () => {
    expect(resolveAxisScale({ tickInterval: 0 }, EXTENT)).toEqual({});
  });

  it("ignores a negative interval but honors the bounds beside it", () => {
    expect(
      resolveAxisScale({ min: 0, max: 50, tickInterval: -5 }, EXTENT),
    ).toEqual({ domain: [0, 50], allowDataOverflow: true });
  });

  it("ignores non-finite values", () => {
    expect(
      resolveAxisScale(
        { min: Number.NaN, max: Number.POSITIVE_INFINITY },
        EXTENT,
      ),
    ).toEqual({});
  });
});
