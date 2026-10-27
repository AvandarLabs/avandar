import { makeColumnIdVizConfigFromLegacyConfig } from "$/models/vizs/makeColumnIdVizConfigFromLegacyConfig/makeColumnIdVizConfigFromLegacyConfig";
import { makeOutputNameVizConfigFromColumnIdConfig } from "$/models/vizs/makeOutputNameVizConfigFromColumnIdConfig/makeOutputNameVizConfigFromColumnIdConfig";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";

type MergeLegacyVizConfigEditOptions = {
  legacy: VizConfig.Legacy;
  before: VizConfig.T;
  after: VizConfig.T;
  columns: readonly QueryResult.ColumnWithId[];
};

type SeriesConfig = Extract<
  VizConfig.Legacy,
  { series: ReadonlyArray<{ key: string }> }
>;

function _mergeSeries({
  legacy,
  edited,
  columns,
}: {
  legacy: SeriesConfig;
  edited: SeriesConfig;
  columns: readonly QueryResult.ColumnWithId[];
}): SeriesConfig["series"] {
  let resolvedIndex = 0;
  const series = legacy.series.flatMap((original) => {
    const single = { ...legacy, series: [original] } as SeriesConfig;
    const columnIdConfig = makeColumnIdVizConfigFromLegacyConfig({
      config: single,
      columns: columns,
    }).config;
    if (!("series" in columnIdConfig) || columnIdConfig.series.length === 0) {
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

/** Applies field changes while retaining unresolved legacy siblings. */
export function mergeLegacyVizConfigEdit({
  legacy,
  before,
  after,
  columns,
}: Readonly<MergeLegacyVizConfigEditOptions>): VizConfig.Legacy {
  if (legacy.vizType !== after.vizType) {
    return legacy;
  }
  const previous = makeOutputNameVizConfigFromColumnIdConfig({
    config: before,
    columns: columns,
  }).config;
  const edited = makeOutputNameVizConfigFromColumnIdConfig({
    config: after,
    columns: columns,
  });
  if (edited.issues.length) {
    return legacy;
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
    "series" in legacy && "series" in edited.config
      ? {
          series: _mergeSeries({
            legacy: legacy,
            edited: edited.config,
            columns: columns,
          }),
        }
      : {};
  // The edit keeps the discriminant and changes only fields of that chart.
  return { ...legacy, ...changes, ...series } as VizConfig.Legacy;
}
