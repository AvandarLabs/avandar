import { DUR, Motion } from "../../src/motion";
import {
  EXPLORER_AGGREGATE_SQL,
  EXPLORER_FILTER_SQL,
} from "../Explorer.constants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types";

type ExplorerStageOptions = { frame: number; mode?: ExplorerMode };

/** Maps a focused ExplorerScreen variant onto its authored full timeline. */
function _getStageTime({
  frame,
  mode,
}: Readonly<{ frame: number; mode: ExplorerMode }>): number {
  return mode === "query"
    ? Math.min(610, frame + 290)
    : mode === "chart"
      ? frame + 570
      : mode === "filter"
        ? Math.min(285, frame)
        : frame;
}

/** Explorer reenactment modes available to component films. */
export type ExplorerMode = "filter" | "query" | "chart" | "full";
/** The empty structured-query filter group every stage falls back to. */
export const emptyFilter = {
  type: "group",
  id: "demo-root",
  combinator: "AND",
  rules: [],
} as const;
/**
 * The `QueryResult` columns the aggregate SQL returns, with the column IDs
 * `barConfig` refers to. `ExplorerScreen` passes them to `SeriesAwareVizForm`
 * as its fields once the stage shows the chart.
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
 * The film's bar chart settings, keyed by the `aggregateColumns` column IDs.
 * Once the stage shows the chart, `ExplorerScreen` shows them in
 * `SeriesAwareVizForm` and passes their series to `BarChart`.
 */
export const barConfig: AvaBarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "film-district" as QueryColumn.Id,
  series: [{ key: "film-cases" as QueryColumn.Id, renderAs: "bar" }],
  layout: "group",
  withLegend: true,
};
/**
 * The explorer film's pointer actions: the frame each happens on and the
 * `data-video-target` it presses. The outer film measures each target in a
 * rendered frame before placing its cursor. Read by `FEATURE_BEATS` and,
 * for a focused variant, by `explorerBeats`.
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
/** What the explorer film shows on one frame. */
type ExplorerStage = {
  time: number;
  isAggregate: boolean;
  isChart: boolean;
  isVisualizations: boolean;
  isSql: boolean;
  isEditingSql: boolean;
  drawerProgress: number;
  hasFilterRule: boolean;
  filterColumn: string;
  filterText: string;
  filterCommitted: boolean;
  sql: string;
};
type ExplorerBeat = (typeof EXPLORER_BEATS)[number];
/** An explorer beat with a mutable frame in a focused variant's local time. */
type LocalExplorerBeat<Beat extends ExplorerBeat = ExplorerBeat> =
  Beat extends unknown
    ? {
        -readonly [Key in keyof Beat]: Key extends "frame" ? number : Beat[Key];
      }
    : never;
/**
 * Works out what the explorer film shows on a frame: which panels are open,
 * the filter being typed, and the SQL in the editor. A focused `mode` plays
 * one part of the full sequence from its own frame 0 and holds its completed
 * state. Called by `ExplorerScreen` on every frame.
 */
function _getStageFromFrame(
  options: Readonly<ExplorerStageOptions>,
): ExplorerStage {
  const { frame, mode = "full" } = options;
  const time = _getStageTime({ frame, mode });
  const isAggregate = mode === "chart" || time > 570;
  const isChart = time > 650 && mode !== "query";
  const isVisualizations = time >= 620 && mode !== "query";
  const isSql = time >= 300 && !isVisualizations;
  const isEditingSql = mode !== "chart" && isSql && time > 344 && time <= 570;
  const filterText = Motion.typed({
    frame: time,
    at: 138,
    text: "Eastbank",
    cps: 12,
  });
  return {
    time,
    isAggregate,
    isChart,
    isVisualizations,
    isSql,
    isEditingSql,
    drawerProgress: Motion.ramp({
      frame: time,
      at: 48,
      dur: DUR.sheet,
    }),
    hasFilterRule: time >= 88 && !isAggregate,
    filterColumn: time >= 112 ? "district_name" : "case_id",
    filterText,
    filterCommitted: time >= 190 && !isAggregate,
    sql: isEditingSql
      ? Motion.typed({
          frame: time,
          at: 370,
          text: EXPLORER_AGGREGATE_SQL,
          cps: 30,
        })
      : isAggregate
        ? EXPLORER_AGGREGATE_SQL
        : EXPLORER_FILTER_SQL,
  };
}
/** Return the same click list in the local coordinates of a focused variant. */
function _getBeatsFromMode(mode: ExplorerMode = "full"): LocalExplorerBeat[] {
  const offset = mode === "query" ? 290 : mode === "chart" ? 570 : 0;
  return EXPLORER_BEATS.filter((beat) => {
    return (
      mode === "full" ||
      (mode === "filter"
        ? beat.frame < 290
        : mode === "query"
          ? beat.frame >= 290 && beat.frame <= 570
          : beat.frame >= 620)
    );
  }).map((beat) => {
    return { ...beat, frame: beat.frame - offset };
  });
}

/**
 * Samples ExplorerScreen fixture stages and click beats at an authored frame.
 */
export const ExplorerTimeline = {
  /**
   * Works out what the explorer film shows on a frame: which panels are open,
   * the filter being typed, and the SQL in the editor.
   */
  getStageFromFrame: _getStageFromFrame,
  /**
   * Return the same click list in the local coordinates of a focused variant.
   */
  getBeatsFromMode: _getBeatsFromMode,
};
