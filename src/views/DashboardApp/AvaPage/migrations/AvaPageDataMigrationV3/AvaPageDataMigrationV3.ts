import { transformProps } from "@puckeditor/core";
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
          // Checkpoint 9 added theme + typography to v3 root props.
          // v2 dashboards default to the unbranded presets.
          theme: "default" as const,
          typography: "system" as const,
          schemaVersion: SCHEMA_VERSION,
        };
      },
      // Cast: the input registry is V3 (puck's invariance), but real v2
      // data carries V2_VizConfig. The cast keeps the helper's input
      // tightly typed at V2.
      DataViz: ((props: { nlQuery: unknown; vizType: unknown; vizConfig: unknown }) => {
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
  switch (v2.vizType) {
    case "table":
      return { vizType: "table" };
    case "bar":
      return {
        vizType: "bar",
        xAxisKey: v2.xAxisKey,
        series:
          v2.yAxisKey === undefined ?
            []
          : [{ renderAs: "bar", key: v2.yAxisKey, color: v2.color }],
        layout: "group",
        withLegend: v2.withLegend,
      };
    case "line":
      return {
        vizType: "line",
        xAxisKey: v2.xAxisKey,
        series:
          v2.yAxisKey === undefined ?
            []
          : [
              {
                renderAs: "line",
                key: v2.yAxisKey,
                color: v2.color,
                curveType: v2.curveType,
              },
            ],
        withLegend: v2.withLegend,
      };
    case "area":
      return {
        vizType: "area",
        xAxisKey: v2.xAxisKey,
        series:
          v2.yAxisKey === undefined ?
            []
          : [
              {
                renderAs: "area",
                key: v2.yAxisKey,
                color: v2.color,
                curveType: v2.curveType,
                fillOpacity: 0.6,
              },
            ],
        layout: "default",
        withLegend: v2.withLegend,
      };
    case "scatter":
      return {
        vizType: "scatter",
        xAxisKey: v2.xAxisKey,
        yAxisKey: v2.yAxisKey,
      };
    case "pie":
      return {
        vizType: "pie",
        nameKey: v2.nameKey,
        valueKey: v2.valueKey,
        isDonut: v2.isDonut,
        withLabels: v2.withLabels,
        labelsType: v2.labelsType,
        seriesColors: v2.seriesColors,
      };
    case "funnel":
      return {
        vizType: "funnel",
        nameKey: v2.nameKey,
        valueKey: v2.valueKey,
        seriesColors: v2.seriesColors,
      };
    case "radar":
      return {
        vizType: "radar",
        nameKey: v2.nameKey,
        series:
          v2.valueKey === undefined ?
            []
          : [{ key: v2.valueKey, color: v2.color }],
        withLegend: true,
      };
    case "bubble":
      return {
        vizType: "bubble",
        xAxisKey: v2.xAxisKey,
        yAxisKey: v2.yAxisKey,
        sizeKey: v2.sizeKey,
      };
  }
}

function _downgradeVizConfig(curr: VizConfig): V2_VizConfig {
  switch (curr.vizType) {
    case "table":
      return { vizType: "table" };
    case "bar": {
      const first = curr.series[0];
      return {
        vizType: "bar",
        xAxisKey: curr.xAxisKey,
        yAxisKey: first?.key,
        withLegend: curr.withLegend,
        color: first?.color,
      };
    }
    case "line": {
      const first = curr.series[0];
      return {
        vizType: "line",
        xAxisKey: curr.xAxisKey,
        yAxisKey: first?.key,
        withLegend: curr.withLegend,
        curveType:
          first?.renderAs === "line" ?
            (first.curveType ?? "monotone")
          : "monotone",
        color: first?.color,
      };
    }
    case "area": {
      const first = curr.series[0];
      return {
        vizType: "area",
        xAxisKey: curr.xAxisKey,
        yAxisKey: first?.key,
        withLegend: curr.withLegend,
        curveType:
          first?.renderAs === "area" ?
            (first.curveType ?? "monotone")
          : "monotone",
        color: first?.color,
      };
    }
    case "scatter":
      return {
        vizType: "scatter",
        xAxisKey: curr.xAxisKey,
        yAxisKey: curr.yAxisKey,
      };
    case "pie":
      return {
        vizType: "pie",
        nameKey: curr.nameKey,
        valueKey: curr.valueKey,
        isDonut: curr.isDonut,
        withLabels: curr.withLabels,
        labelsType: curr.labelsType,
        seriesColors: curr.seriesColors,
      };
    case "funnel":
      return {
        vizType: "funnel",
        nameKey: curr.nameKey,
        valueKey: curr.valueKey,
        seriesColors: curr.seriesColors,
      };
    case "radar": {
      const first = curr.series[0];
      return {
        vizType: "radar",
        nameKey: curr.nameKey,
        valueKey: first?.key,
        color: first?.color,
      };
    }
    case "bubble":
      return {
        vizType: "bubble",
        xAxisKey: curr.xAxisKey,
        yAxisKey: curr.yAxisKey,
        sizeKey: curr.sizeKey,
      };
  }
}
