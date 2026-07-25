import { transformProps } from "@puckeditor/core";
import { match } from "ts-pattern";
import { AvaPageDataMigration } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import type {
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_VizConfig,
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V3_PBlockPropsRegistry,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

const SCHEMA_VERSION = 3;

/**
 * Upgrade from dashboard v2 to v3.
 *
 * Replaces single-key viz configs (e.g. `{ vizType: "bar", yAxisKey:
 * "value", color: "#f00" }`) with the series-array shape (e.g. `{
 * vizType: "bar", series: [{ renderAs: "bar", key: "value", color:
 * "#f00" }], layout: "group" }`) so each viz host can render multiple
 * series with independent settings.
 *
 * Radar gains a `series` array as well; pie / funnel / scatter / bubble
 * keep their existing shapes.
 */
export const AvaPageDataMigrationV3 = {
  downgradedVersion: 2,
  upgradedVersion: SCHEMA_VERSION,

  upgrade: (prevData: V2_AvaPageData): V3_AvaPageData => {
    // The current PBlock registry has gained keys since v2 was frozen
    // (`Filter`, etc.). Puck's `transformProps` constraint requires the
    // input registry to be a superset of those keys, so we cast the
    // input registry to V3's wider shape. Real v2 data can never carry
    // those new block types.
    return transformProps<
      V3_PBlockPropsRegistry,
      V2_AvaPageRootProps,
      V3_PBlockPropsRegistry,
      V3_AvaPageRootProps
    >(prevData as unknown as V3_AvaPageData, {
      root: (props) => {
        return {
          ...props,
          // v3 root props added theme + typography; v2 dashboards
          // predate them, so default to the unbranded presets.
          theme: "default" as const,
          typography: "system" as const,
          schemaVersion: SCHEMA_VERSION,
        };
      },
      // Cast: the input registry is V3 (puck's invariance), but real v2
      // data carries V2_VizConfig. The cast keeps the helper's input
      // tightly typed at V2.
      DataViz: ((props: {
        nlQuery: unknown;
        vizType: unknown;
        vizConfig: unknown;
      }) => {
        return {
          nlQuery: props.nlQuery,
          vizType: props.vizType,
          vizConfig: _upgradeVizConfig(props.vizConfig as V2_VizConfig),
        };
      }) as unknown as (
        props: V3_PBlockPropsRegistry["DataViz"],
      ) => V3_PBlockPropsRegistry["DataViz"],
    });
  },

  downgrade: (currData: V3_AvaPageData): V2_AvaPageData => {
    // V2 didn't know about the newer block types (e.g. `Filter`). For
    // the downgrade we still hand puck the V3 registry shape so the
    // generics line up, then cast the result back to `V2_AvaPageData`
    // at the boundary. Callers that rely on v1 data structure should
    // strip / drop unknown blocks before re-serialising.
    return transformProps<
      V3_PBlockPropsRegistry,
      V3_AvaPageRootProps,
      V3_PBlockPropsRegistry,
      V2_AvaPageRootProps
    >(currData, {
      root: (props) => {
        // Strip v3-only fields when downgrading.
        const { theme: _theme, typography: _typography, ...v2Props } = props;
        return { ...v2Props, schemaVersion: 2 };
      },
      // Cast through `unknown` because the V2 viz config shape (the
      // return value) is narrower than the V3 viz config the function
      // signature expects — puck's transform-prop typing is invariant
      // on the registry argument.
      DataViz: ((props: V3_PBlockPropsRegistry["DataViz"]) => {
        return {
          nlQuery: props.nlQuery,
          vizType: props.vizType,
          vizConfig: _downgradeVizConfig(props.vizConfig),
        };
      }) as unknown as (
        props: V3_PBlockPropsRegistry["DataViz"],
      ) => V3_PBlockPropsRegistry["DataViz"],
    }) as unknown as V2_AvaPageData;
  },
} satisfies AvaPageDataMigration<V2_AvaPageData, V3_AvaPageData>;

function _upgradeVizConfig(v2: V2_VizConfig): VizConfig {
  return match(v2)
    .returnType<VizConfig>()
    .with({ vizType: "table" }, () => {
      return { vizType: "table" };
    })
    .with({ vizType: "bar" }, (bar) => {
      return {
        vizType: "bar",
        xAxisKey: bar.xAxisKey,
        series:
          bar.yAxisKey === undefined ?
            []
          : [{ renderAs: "bar", key: bar.yAxisKey, color: bar.color }],
        layout: "group",
        withLegend: bar.withLegend,
      };
    })
    .with({ vizType: "line" }, (line) => {
      return {
        vizType: "line",
        xAxisKey: line.xAxisKey,
        series:
          line.yAxisKey === undefined ?
            []
          : [
              {
                renderAs: "line",
                key: line.yAxisKey,
                color: line.color,
                curveType: line.curveType,
              },
            ],
        withLegend: line.withLegend,
      };
    })
    .with({ vizType: "area" }, (area) => {
      return {
        vizType: "area",
        xAxisKey: area.xAxisKey,
        series:
          area.yAxisKey === undefined ?
            []
          : [
              {
                renderAs: "area",
                key: area.yAxisKey,
                color: area.color,
                curveType: area.curveType,
                fillOpacity: 0.6,
              },
            ],
        layout: "default",
        withLegend: area.withLegend,
      };
    })
    .with({ vizType: "scatter" }, (scatter) => {
      return {
        vizType: "scatter",
        series:
          scatter.xAxisKey !== undefined && scatter.yAxisKey !== undefined ?
            [{ xKey: scatter.xAxisKey, key: scatter.yAxisKey }]
          : [],
      };
    })
    .with({ vizType: "pie" }, (pie) => {
      return {
        vizType: "pie",
        nameKey: pie.nameKey,
        valueKey: pie.valueKey,
        isDonut: pie.isDonut,
        withLabels: pie.withLabels,
        labelsType: pie.labelsType,
        seriesColors: pie.seriesColors,
      };
    })
    .with({ vizType: "funnel" }, (funnel) => {
      return {
        vizType: "funnel",
        nameKey: funnel.nameKey,
        valueKey: funnel.valueKey,
        seriesColors: funnel.seriesColors,
      };
    })
    .with({ vizType: "radar" }, (radar) => {
      return {
        vizType: "radar",
        nameKey: radar.nameKey,
        series:
          radar.valueKey === undefined ?
            []
          : [{ key: radar.valueKey, color: radar.color }],
        withLegend: true,
      };
    })
    .with({ vizType: "bubble" }, (bubble) => {
      return {
        vizType: "bubble",
        series:
          bubble.xAxisKey !== undefined && bubble.yAxisKey !== undefined ?
            [
              {
                xKey: bubble.xAxisKey,
                key: bubble.yAxisKey,
                sizeKey: bubble.sizeKey ?? bubble.yAxisKey,
              },
            ]
          : [],
      };
    })
    .exhaustive();
}

function _downgradeVizConfig(curr: VizConfig): V2_VizConfig {
  return match(curr)
    .returnType<V2_VizConfig>()
    .with({ vizType: "table" }, () => {
      return { vizType: "table" };
    })
    .with({ vizType: "bar" }, (bar) => {
      const first = bar.series[0];
      return {
        vizType: "bar",
        xAxisKey: bar.xAxisKey,
        yAxisKey: first?.key,
        withLegend: bar.withLegend,
        color: first?.color,
      };
    })
    .with({ vizType: "line" }, (line) => {
      const first = line.series[0];
      return {
        vizType: "line",
        xAxisKey: line.xAxisKey,
        yAxisKey: first?.key,
        withLegend: line.withLegend,
        curveType:
          first?.renderAs === "line" ?
            (first.curveType ?? "monotone")
          : "monotone",
        color: first?.color,
      };
    })
    .with({ vizType: "area" }, (area) => {
      const first = area.series[0];
      return {
        vizType: "area",
        xAxisKey: area.xAxisKey,
        yAxisKey: first?.key,
        withLegend: area.withLegend,
        curveType:
          first?.renderAs === "area" ?
            (first.curveType ?? "monotone")
          : "monotone",
        color: first?.color,
      };
    })
    .with({ vizType: "scatter" }, (scatter) => {
      const first = scatter.series[0];
      return {
        vizType: "scatter",
        xAxisKey: first?.xKey,
        yAxisKey: first?.key,
      };
    })
    .with({ vizType: "pie" }, (pie) => {
      return {
        vizType: "pie",
        nameKey: pie.nameKey,
        valueKey: pie.valueKey,
        isDonut: pie.isDonut,
        withLabels: pie.withLabels,
        labelsType: pie.labelsType,
        seriesColors: pie.seriesColors,
      };
    })
    .with({ vizType: "funnel" }, (funnel) => {
      return {
        vizType: "funnel",
        nameKey: funnel.nameKey,
        valueKey: funnel.valueKey,
        seriesColors: funnel.seriesColors,
      };
    })
    .with({ vizType: "radar" }, (radar) => {
      const first = radar.series[0];
      return {
        vizType: "radar",
        nameKey: radar.nameKey,
        valueKey: first?.key,
        color: first?.color,
      };
    })
    .with({ vizType: "bubble" }, (bubble) => {
      const first = bubble.series[0];
      return {
        vizType: "bubble",
        xAxisKey: first?.xKey,
        yAxisKey: first?.key,
        sizeKey: first?.sizeKey,
      };
    })
    .exhaustive();
}
