import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

type MergeUiVizConfigEditOptions = {
  uiVizConfig: UiVizConfig;
  before: AvaVizConfig.T;
  after: AvaVizConfig.T;
  columns: readonly QueryResult.ColumnWithId[];
};

type SeriesConfig = Extract<
  UiVizConfig,
  { series: ReadonlyArray<{ key: string }> }
>;

function _mergeSeries({
  uiVizConfig,
  edited,
  columns,
}: {
  uiVizConfig: SeriesConfig;
  edited: SeriesConfig;
  columns: readonly QueryResult.ColumnWithId[];
}): SeriesConfig["series"] {
  let resolvedIndex = 0;
  const series = uiVizConfig.series.flatMap((original) => {
    const single = {
      ...uiVizConfig,
      series: [original],
    } as SeriesConfig;
    const vizConfig = AvaVizConfigs.makeFromUiVizConfig({
      config: single,
      columns: columns,
    }).config;
    if (!("series" in vizConfig) || vizConfig.series.length === 0) {
      return [original];
    }
    const updated = edited.series[resolvedIndex++];
    return updated ? [updated] : [];
  });
  return [
    ...series,
    ...edited.series.slice(resolvedIndex),
  ] as SeriesConfig["series"];
}

/**
 * Applies a settings edit, made on the column ID form of a version 0 chart's
 * config, back onto its config keyed by `QueryResult` column name. Settings
 * and series whose names do not bind stay as saved. Called only by
 * `getDataVizAuthoringProps` when a version 0 chart's viz settings change.
 */
export function mergeUiVizConfigEdit({
  uiVizConfig,
  before,
  after,
  columns,
}: Readonly<MergeUiVizConfigEditOptions>): UiVizConfig {
  if (uiVizConfig.vizType !== after.vizType) {
    return uiVizConfig;
  }
  const previous = AvaVizConfigs.toUiVizConfig({
    config: before,
    columns: columns,
  }).config;
  const edited = AvaVizConfigs.toUiVizConfig({
    config: after,
    columns: columns,
  });
  if (edited.issues.length) {
    return uiVizConfig;
  }
  const previousValues = new Map(Object.entries(previous));
  const changes = Object.fromEntries(
    Object.entries(edited.config).filter(([key, value]) => {
      return (
        key !== "series" &&
        JSON.stringify(previousValues.get(key)) !== JSON.stringify(value)
      );
    }),
  );
  const series =
    "series" in uiVizConfig && "series" in edited.config
      ? {
          series: _mergeSeries({
            uiVizConfig: uiVizConfig,
            edited: edited.config,
            columns: columns,
          }),
        }
      : {};
  // The edit keeps the discriminant and changes only fields of that chart.
  return {
    ...uiVizConfig,
    ...changes,
    ...series,
  } as UiVizConfig;
}
