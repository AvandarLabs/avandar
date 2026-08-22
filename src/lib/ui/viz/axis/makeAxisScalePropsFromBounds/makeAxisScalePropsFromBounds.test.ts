import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

import { describe, expect, it } from "vitest";

import { makeAxisScalePropsFromBounds } from "@/lib/ui/viz/axis/makeAxisScalePropsFromBounds/makeAxisScalePropsFromBounds";

const EXTENT = { min: 0, max: 100 };

describe("makeAxisScalePropsFromBounds: no configuration", () => {
  it("returns nothing when the axis is undefined", () => {
    expect(
      makeAxisScalePropsFromBounds({ axis: undefined, extent: EXTENT }),
    ).toEqual({});
  });

  it("returns nothing when only cosmetic settings are present", () => {
    // Typed as a full `AxisStyle` because that is what callers hand in:
    // the scale resolver only reads the scale fields, but the object it
    // receives carries the cosmetic ones too.
    const cosmeticOnly: AxisStyle = { label: "Revenue" };
    expect(
      makeAxisScalePropsFromBounds({ axis: cosmeticOnly, extent: EXTENT }),
    ).toEqual({});
  });
});

describe("makeAxisScalePropsFromBounds: bounds without an interval", () => {
  it("uses both explicit bounds and clips data to them", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 10, max: 90 },
        extent: EXTENT,
      }),
    ).toEqual({
      domain: [10, 90],
      allowDataOverflow: true,
    });
  });

  it("zero-anchors a derived minimum for non-negative data", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { max: 90 },
        extent: { min: 20, max: 100 },
      }),
    ).toEqual({
      domain: [0, 90],
      allowDataOverflow: true,
    });
  });

  it("uses the data minimum when the data goes negative", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { max: 90 },
        extent: { min: -30, max: 100 },
      }),
    ).toEqual({
      domain: [-30, 90],
      allowDataOverflow: true,
    });
  });

  it("derives the maximum from the data when only a minimum is set", () => {
    expect(
      makeAxisScalePropsFromBounds({ axis: { min: 10 }, extent: EXTENT }),
    ).toEqual({
      domain: [10, 100],
      allowDataOverflow: true,
    });
  });

  it("falls back to auto when there is no extent to derive from", () => {
    expect(
      makeAxisScalePropsFromBounds({ axis: { min: 10 }, extent: undefined }),
    ).toEqual({
      domain: [10, "auto"],
      allowDataOverflow: true,
    });
  });
});

describe("makeAxisScalePropsFromBounds: tick interval", () => {
  it("generates ticks across an explicit domain", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 0, max: 120000, tickInterval: 24000 },
        extent: { min: 0, max: 118000 },
      }),
    ).toEqual({
      domain: [0, 120000],
      ticks: [0, 24000, 48000, 72000, 96000, 120000],
      allowDataOverflow: true,
    });
  });

  it("works from the interval alone by deriving both bounds", () => {
    const result = makeAxisScalePropsFromBounds({
      axis: { tickInterval: 25 },
      extent: { min: 0, max: 90 },
    });
    expect(result).toEqual({
      domain: [0, 100],
      ticks: [0, 25, 50, 75, 100],
    });
  });

  it("anchors the tick lattice at an explicit non-aligned minimum", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 1000, tickInterval: 24000 },
        extent: { min: 0, max: 50000 },
      }),
    ).toEqual({
      domain: [1000, 73000],
      ticks: [1000, 25000, 49000, 73000],
      allowDataOverflow: true,
    });
  });

  it("truncates the last tick when an explicit maximum falls between ticks", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 0, max: 100000, tickInterval: 24000 },
        extent: { min: 0, max: 100000 },
      }),
    ).toEqual({
      domain: [0, 100000],
      ticks: [0, 24000, 48000, 72000, 96000],
      allowDataOverflow: true,
    });
  });

  it("does not set allowDataOverflow when both bounds are derived", () => {
    const result = makeAxisScalePropsFromBounds({
      axis: { tickInterval: 25 },
      extent: { min: 0, max: 90 },
    });
    expect(result.allowDataOverflow).toBeUndefined();
  });

  it("drops ticks but keeps the domain when the count exceeds the cap", () => {
    const result = makeAxisScalePropsFromBounds({
      axis: { min: 0, max: 1_000_000, tickInterval: 1 },
      extent: { min: 0, max: 1_000_000 },
    });
    expect(result.ticks).toBeUndefined();
    expect(result.domain).toEqual([0, 1_000_000]);
  });

  it("survives a fractional interval without floating point drift", () => {
    const result = makeAxisScalePropsFromBounds({
      axis: { min: 0, max: 1, tickInterval: 0.1 },
      extent: { min: 0, max: 1 },
    });
    expect(result.ticks).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
  });

  it("keeps the final tick when the division lands just under a whole step", () => {
    // `(0.3 - 0) / 0.1` is `2.9999999999999996`, so without
    // TICK_COUNT_EPSILON this lattice silently loses its endpoint.
    // The 0-to-1 case above does not exercise the epsilon: `1 / 0.1` is
    // exactly `10` in IEEE754.
    const result = makeAxisScalePropsFromBounds({
      axis: { min: 0, max: 0.3, tickInterval: 0.1 },
      extent: { min: 0, max: 0.3 },
    });
    expect(result.ticks).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("ignores an interval wider than the data when the high bound is derived", () => {
    // The lattice would otherwise extend a full interval past the data
    // and squash every mark into a sliver.
    expect(
      makeAxisScalePropsFromBounds({
        axis: { tickInterval: 1_000_000 },
        extent: { min: 0, max: 100 },
      }),
    ).toEqual({ domain: [0, 100] });
  });

  it("ignores a data-unit interval typed onto a percent axis", () => {
    // A percent-stacked chart's real domain is 0-to-1 while its ticks
    // read as percentages, so a user may enter 20 meaning 20%.
    expect(
      makeAxisScalePropsFromBounds({
        axis: { tickInterval: 20 },
        extent: { min: 0, max: 1 },
      }),
    ).toEqual({ domain: [0, 1] });
  });

  it("builds a lattice when the interval equals the data range", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { tickInterval: 100 },
        extent: { min: 0, max: 100 },
      }),
    ).toEqual({ domain: [0, 100], ticks: [0, 100] });
  });

  it("honours an oversized interval when the user set the maximum", () => {
    // Both bounds explicit means the domain is the user's choice.
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 0, max: 1_000_000, tickInterval: 1_000_000 },
        extent: { min: 0, max: 100 },
      }),
    ).toEqual({
      domain: [0, 1_000_000],
      ticks: [0, 1_000_000],
      allowDataOverflow: true,
    });
  });

  it("drops a lattice that would hold a single tick", () => {
    // An explicit maximum closer to the minimum than one interval step
    // yields just the origin. Recharts picks better ticks than that.
    const result = makeAxisScalePropsFromBounds({
      axis: { min: 0, max: 100, tickInterval: 1_000_000 },
      extent: { min: 0, max: 100 },
    });
    expect(result.ticks).toBeUndefined();
    expect(result.domain).toEqual([0, 100]);
  });
});

describe("makeAxisScalePropsFromBounds: guards", () => {
  it("ignores an inverted explicit range", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 100, max: 10 },
        extent: EXTENT,
      }),
    ).toEqual({});
  });

  it("ignores an equal explicit range", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 50, max: 50 },
        extent: EXTENT,
      }),
    ).toEqual({});
  });

  it("ignores a zero interval", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { tickInterval: 0 },
        extent: EXTENT,
      }),
    ).toEqual({});
  });

  it("ignores a negative interval but honors the bounds beside it", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: 0, max: 50, tickInterval: -5 },
        extent: EXTENT,
      }),
    ).toEqual({ domain: [0, 50], allowDataOverflow: true });
  });

  it("ignores non-finite values", () => {
    expect(
      makeAxisScalePropsFromBounds({
        axis: { min: Number.NaN, max: Number.POSITIVE_INFINITY },
        extent: EXTENT,
      }),
    ).toEqual({});
  });
});
