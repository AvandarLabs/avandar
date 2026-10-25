import { DUR, ramp, typed } from "../../src/motion";
import {
  EXPLORER_AGGREGATE_SQL,
  EXPLORER_FILTER_SQL,
} from "../Explorer.constants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";

export type ExplorerMode = "filter" | "query" | "chart" | "full";

/** The empty structured-query filter group every stage falls back to. */
export const emptyFilter = {
  type: "group",
  id: "demo-root",
  combinator: "AND",
  rules: [],
} as const;

/**
 * Column metadata for the chart-mode series editor, matching the aggregate
 * SQL.
 */
export const aggregateColumns = [
  {
    id: "film-district" as QueryColumn.Id,
    name: "district_name",
    dataType: "varchar",
  },
  {
    id: "film-cases" as QueryColumn.Id,
    name: "recorded_cases",
    dataType: "bigint",
  },
] as const;

/**
 * The bar chart config shown once the stage reaches its chart/visualizations
 * phase.
 */
export const barConfig: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "film-district" as QueryColumn.Id,
  series: [{ key: "film-cases" as QueryColumn.Id, renderAs: "bar" }],
  layout: "group",
  withLegend: true,
};

/**
 * Body-frame click targets. The outer film measures these DOM nodes before
 * assigning cursor positions.
 */
export const EXPLORER_BEATS = [
  { frame: 48, target: "explorer-query-tab", action: "click" },
  { frame: 88, target: "explorer-add-condition", action: "click" },
  { frame: 104, target: "explorer-filter-column", action: "click" },
  { frame: 132, target: "explorer-filter-value", action: "click" },
  { frame: 190, target: "explorer-filter-value", action: "commit" },
  { frame: 300, target: "explorer-sql-mode", action: "click" },
  { frame: 344, target: "explorer-edit-query", action: "click" },
  { frame: 364, target: "explorer-sql-editor", action: "click" },
  { frame: 570, target: "explorer-run-query", action: "click" },
  { frame: 620, target: "explorer-viz-tab", action: "click" },
  { frame: 650, target: "explorer-viz-type", action: "click" },
] as const;

/**
 * The focused variants retain a readable action sequence and hold their
 * completed state.
 */
export function explorerStage(frame: number, mode: ExplorerMode = "full") {
  const time =
    mode === "query"
      ? Math.min(610, frame + 290)
      : mode === "chart"
        ? frame + 570
        : mode === "filter"
          ? Math.min(285, frame)
          : frame;
  const isAggregate = mode === "chart" || time > 570;
  const isChart = time > 650 && mode !== "query";
  const isVisualizations = time >= 620 && mode !== "query";
  const isSql = time >= 300 && !isVisualizations;
  const isEditingSql = mode !== "chart" && isSql && time > 344 && time <= 570;
  const filterText = typed(time, 138, "Eastbank", 12);
  return {
    time,
    isAggregate,
    isChart,
    isVisualizations,
    isSql,
    isEditingSql,
    drawerProgress: ramp(time, 48, DUR.sheet),
    hasFilterRule: time >= 88 && !isAggregate,
    filterColumn: time >= 112 ? "district_name" : "case_id",
    filterText,
    filterCommitted: time >= 190 && !isAggregate,
    sql: isEditingSql
      ? typed(time, 370, EXPLORER_AGGREGATE_SQL, 30)
      : isAggregate
        ? EXPLORER_AGGREGATE_SQL
        : EXPLORER_FILTER_SQL,
  };
}

/** Return the same click list in the local coordinates of a focused variant. */
export function explorerBeats(mode: ExplorerMode = "full") {
  const offset = mode === "query" ? 290 : mode === "chart" ? 570 : 0;
  return EXPLORER_BEATS.filter(
    (beat) =>
      mode === "full" ||
      (mode === "filter"
        ? beat.frame < 290
        : mode === "query"
          ? beat.frame >= 290 && beat.frame <= 570
          : beat.frame >= 620),
  ).map((beat) => ({ ...beat, frame: beat.frame - offset }));
}
