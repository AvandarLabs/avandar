import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs.ts";
import { describe, expect, it } from "vitest";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type {
  VizConfig,
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

/**
 * A distinctive chart style. Every field is set to a non-default value so a
 * converter that rebuilds `chartStyle` from scratch, rather than carrying the
 * source's, shows up as a mismatch instead of an accidental pass.
 */
const CHART_STYLE: ChartStyle = {
  xAxis: { label: "Quarter", tickAngle: 45 },
  yAxis: { label: "Revenue (USD)", min: 0, max: 100, tickInterval: 25 },
  grid: { color: "#e0e0e0", horizontal: false, vertical: true },
  legend: { position: "left" },
};

const SERIES_COLORS = { North: "#00ff00", South: "#0000ff" };

/**
 * One fully-populated config per viz type: every optional field set, and every
 * field that has a default set to something *other* than that default. A
 * converter that drops a field therefore fails loudly rather than coinciding
 * with the target's `makeEmptyConfig` value.
 */
const FIXTURES: { [K in VizType]: VizConfigType<K> } = {
  table: { vizType: "table" },

  bar: {
    vizType: "bar",
    xAxisKey: "quarter",
    series: [
      {
        renderAs: "bar",
        key: "revenue",
        label: "Revenue",
        color: "#ff0000",
        fillOpacity: 0.5,
        stackId: "a",
      },
    ],
    layout: "stack",
    withLegend: false,
    chartStyle: CHART_STYLE,
  },

  line: {
    vizType: "line",
    xAxisKey: "quarter",
    series: [
      {
        renderAs: "line",
        key: "revenue",
        label: "Revenue",
        color: "#ff0000",
        curveType: "step",
        strokeWidth: 3,
        withDots: true,
      },
    ],
    withLegend: false,
    chartStyle: CHART_STYLE,
  },

  area: {
    vizType: "area",
    xAxisKey: "quarter",
    series: [
      {
        renderAs: "area",
        key: "revenue",
        label: "Revenue",
        color: "#ff0000",
        curveType: "step",
        strokeWidth: 3,
        fillOpacity: 0.5,
        withDots: true,
      },
    ],
    layout: "stacked",
    withLegend: false,
    chartStyle: CHART_STYLE,
  },

  scatter: {
    vizType: "scatter",
    series: [
      { xKey: "cost", key: "revenue", label: "Revenue", color: "#ff0000" },
    ],
    chartStyle: CHART_STYLE,
  },

  bubble: {
    vizType: "bubble",
    series: [
      {
        xKey: "cost",
        key: "revenue",
        sizeKey: "volume",
        label: "Revenue",
        color: "#ff0000",
      },
    ],
    chartStyle: CHART_STYLE,
  },

  radar: {
    vizType: "radar",
    nameKey: "quarter",
    series: [
      {
        key: "revenue",
        label: "Revenue",
        color: "#ff0000",
        strokeWidth: 3,
        fillOpacity: 0.5,
      },
    ],
    withLegend: false,
    chartStyle: CHART_STYLE,
  },

  pie: {
    vizType: "pie",
    nameKey: "quarter",
    valueKey: "revenue",
    isDonut: true,
    withLabels: false,
    labelsType: "percent",
    seriesColors: SERIES_COLORS,
  },

  funnel: {
    vizType: "funnel",
    nameKey: "quarter",
    valueKey: "revenue",
    seriesColors: SERIES_COLORS,
  },
};

/**
 * Optional fields per viz type. Required fields are derived from
 * `makeEmptyConfig`, which returns exactly the required set, so this table
 * only has to name the fields that config type declares as optional.
 */
const OPTIONAL_KEYS: { [K in VizType]: ReadonlyArray<keyof VizConfigType<K>> } =
  {
    table: [],
    bar: ["chartStyle"],
    line: ["chartStyle"],
    area: ["chartStyle"],
    scatter: ["chartStyle"],
    bubble: ["chartStyle"],
    radar: ["chartStyle"],
    pie: ["seriesColors"],
    funnel: ["seriesColors"],
  };

function fixtureFor(vizType: VizType): VizConfig {
  return FIXTURES[vizType] as VizConfig;
}

describe("VizConfigs.convertVizConfig shape matrix", () => {
  VizTypes.forEach((sourceType) => {
    VizTypes.forEach((targetType) => {
      it(`${sourceType} -> ${targetType} produces a well-formed config`, () => {
        const result = VizConfigs.convertVizConfig(
          fixtureFor(sourceType),
          targetType,
        );

        expect(result.vizType).toBe(targetType);

        // `makeEmptyConfig` returns exactly the required fields, so its keys
        // are the required set and its keys plus the optional table are the
        // full set of fields this viz type declares.
        const requiredKeys = Object.keys(
          VizConfigs.makeEmptyConfig(targetType),
        );
        const allowedKeys = new Set([
          ...requiredKeys,
          ...(OPTIONAL_KEYS[targetType] as readonly string[]),
        ]);
        const resultKeys = Object.keys(result);

        // No required field silently missing.
        expect(resultKeys).toEqual(expect.arrayContaining(requiredKeys));

        // No field the target type does not declare.
        expect(
          resultKeys.filter((key) => {
            return !allowedKeys.has(key);
          }),
        ).toEqual([]);
      });
    });
  });
});

/**
 * Viz types that declare each shared field. A field must survive any single
 * hop between two types that both declare it — that is the whole contract
 * `convertVizConfig` owes the user.
 */
const DECLARED_BY = {
  chartStyle: ["bar", "line", "area", "scatter", "bubble", "radar"],
  withLegend: ["bar", "line", "area", "radar"],
  seriesColors: ["pie", "funnel"],
} as const satisfies Record<string, readonly VizType[]>;

describe("VizConfigs.convertVizConfig field preservation", () => {
  describe.each(
    Object.entries(DECLARED_BY) as ReadonlyArray<
      [keyof typeof DECLARED_BY, readonly VizType[]]
    >,
  )("%s", (field, declaringTypes) => {
    declaringTypes.forEach((sourceType) => {
      declaringTypes.forEach((targetType) => {
        if (sourceType === targetType) {
          return;
        }
        it(`survives ${sourceType} -> ${targetType}`, () => {
          const source = fixtureFor(sourceType) as Record<string, unknown>;
          const result = VizConfigs.convertVizConfig(
            fixtureFor(sourceType),
            targetType,
          ) as Record<string, unknown>;

          expect(result[field]).toEqual(source[field]);
        });
      });
    });
  });
});

describe("VizConfigs.convertVizConfig layout mapping", () => {
  it.each([
    { from: "group", to: "default" },
    { from: "stack", to: "stacked" },
    { from: "percent", to: "percent" },
  ] as const)("bar $from -> area $to", ({ from, to }) => {
    const result = VizConfigs.convertVizConfig(
      { ...FIXTURES.bar, layout: from },
      "area",
    );
    expect(result.layout).toBe(to);
  });

  it.each([
    { from: "default", to: "group" },
    { from: "stacked", to: "stack" },
    { from: "percent", to: "percent" },
  ] as const)("area $from -> bar $to", ({ from, to }) => {
    const result = VizConfigs.convertVizConfig(
      { ...FIXTURES.area, layout: from },
      "bar",
    );
    expect(result.layout).toBe(to);
  });

  it("falls back to the bar default for the area-only split layout", () => {
    const result = VizConfigs.convertVizConfig(
      { ...FIXTURES.area, layout: "split" },
      "bar",
    );
    expect(result.layout).toBe(VizConfigs.makeEmptyConfig("bar").layout);
  });
});

const WITH_LEGEND_TYPES = DECLARED_BY.withLegend;

describe("VizConfigs.convertVizConfig invents no defaults", () => {
  WITH_LEGEND_TYPES.forEach((sourceType) => {
    WITH_LEGEND_TYPES.forEach((targetType) => {
      if (sourceType === targetType) {
        return;
      }
      it(`keeps withLegend false across ${sourceType} -> ${targetType}`, () => {
        const result = VizConfigs.convertVizConfig(
          fixtureFor(sourceType),
          targetType,
        ) as { withLegend?: boolean };

        expect(result.withLegend).toBe(false);
      });
    });
  });

  // Sources that do not declare `withLegend` have no value to carry, so the
  // target must land on its own `makeEmptyConfig` default rather than a
  // literal baked into the converter. This is what stops the two from
  // drifting apart when a chart's default legend visibility changes.
  const sourcesWithoutLegend = VizTypes.filter((vizType) => {
    return !(WITH_LEGEND_TYPES as readonly VizType[]).includes(vizType);
  });

  sourcesWithoutLegend.forEach((sourceType) => {
    WITH_LEGEND_TYPES.forEach((targetType) => {
      it(`uses the ${targetType} default for withLegend from ${sourceType}`, () => {
        const result = VizConfigs.convertVizConfig(
          fixtureFor(sourceType),
          targetType,
        ) as { withLegend?: boolean };
        const emptyTarget = VizConfigs.makeEmptyConfig(targetType) as {
          withLegend?: boolean;
        };

        expect(result.withLegend).toBe(emptyTarget.withLegend);
      });
    });
  });
});
