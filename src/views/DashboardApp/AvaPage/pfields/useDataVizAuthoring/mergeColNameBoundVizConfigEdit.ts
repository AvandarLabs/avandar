import { makeColNameBoundVizConfigFromVizConfig } from "$/models/vizs/makeColNameBoundVizConfigFromVizConfig/makeColNameBoundVizConfigFromVizConfig";
import { makeVizConfigFromColNameBoundVizConfig } from "$/models/vizs/makeVizConfigFromColNameBoundVizConfig/makeVizConfigFromColNameBoundVizConfig";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";

type MergeColNameBoundVizConfigEditOptions = {
  colNameBoundConfig: VizConfig.ColNameBound;
  before: VizConfig.T;
  after: VizConfig.T;
  columns: readonly QueryResult.ColumnWithId[];
};

type SeriesConfig = Extract<
  VizConfig.ColNameBound,
  { series: ReadonlyArray<{ key: string }> }
>;

function _mergeSeries({
  colNameBoundConfig,
  edited,
  columns,
}: {
  colNameBoundConfig: SeriesConfig;
  edited: SeriesConfig;
  columns: readonly QueryResult.ColumnWithId[];
}): SeriesConfig["series"] {
  let resolvedIndex = 0;
  const series = colNameBoundConfig.series.flatMap((original) => {
    const single = {
      ...colNameBoundConfig,
      series: [original],
    } as SeriesConfig;
    const vizConfig = makeVizConfigFromColNameBoundVizConfig({
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

/** Applies field changes while retaining unresolved name-bound siblings. */
export function mergeColNameBoundVizConfigEdit({
  colNameBoundConfig,
  before,
  after,
  columns,
}: Readonly<MergeColNameBoundVizConfigEditOptions>): VizConfig.ColNameBound {
  if (colNameBoundConfig.vizType !== after.vizType) {
    return colNameBoundConfig;
  }
  const previous = makeColNameBoundVizConfigFromVizConfig({
    config: before,
    columns: columns,
  }).config;
  const edited = makeColNameBoundVizConfigFromVizConfig({
    config: after,
    columns: columns,
  });
  if (edited.issues.length) {
    return colNameBoundConfig;
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
    "series" in colNameBoundConfig && "series" in edited.config
      ? {
          series: _mergeSeries({
            colNameBoundConfig: colNameBoundConfig,
            edited: edited.config,
            columns: columns,
          }),
        }
      : {};
  // The edit keeps the discriminant and changes only fields of that chart.
  return {
    ...colNameBoundConfig,
    ...changes,
    ...series,
  } as VizConfig.ColNameBound;
}
