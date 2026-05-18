import { transformProps } from "@puckeditor/core";
import { AvaPageDataMigration } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import type {
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_PBlockPropsRegistry,
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
    return transformProps<
      V2_PBlockPropsRegistry,
      V2_AvaPageRootProps,
      V3_PBlockPropsRegistry,
      V3_AvaPageRootProps
    >(prevData, {
      root: (props) => {
        return { ...props, schemaVersion: SCHEMA_VERSION };
      },
      DataViz: (props) => {
        return {
          nlQuery: props.nlQuery,
          vizType: props.vizType,
          vizConfig: _upgradeVizConfig(props.vizConfig),
        };
      },
    });
  },

  downgrade: (currData: V3_AvaPageData): V2_AvaPageData => {
    return transformProps<
      V3_PBlockPropsRegistry,
      V3_AvaPageRootProps,
      V2_PBlockPropsRegistry,
      V2_AvaPageRootProps
    >(currData, {
      root: (props) => {
        return { ...props, schemaVersion: 2 };
      },
      DataViz: (props) => {
        return {
          nlQuery: props.nlQuery,
          vizType: props.vizType,
          vizConfig: _downgradeVizConfig(props.vizConfig),
        };
      },
    });
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
