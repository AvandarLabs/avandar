import { makeNameBoundVizConfigFromVizConfig } from "$/models/vizs/makeNameBoundVizConfigFromVizConfig/makeNameBoundVizConfigFromVizConfig";
import { makeVizConfigFromNameBoundVizConfig } from "$/models/vizs/makeVizConfigFromNameBoundVizConfig/makeVizConfigFromNameBoundVizConfig";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";

type MergeLegacyVizConfigEditOptions = {
  legacy: VizConfig.NameBound;
  before: VizConfig.T;
  after: VizConfig.T;
  columns: readonly QueryResult.ColumnWithId[];
};

type SeriesConfig = Extract<
  VizConfig.NameBound,
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
    const vizConfig = makeVizConfigFromNameBoundVizConfig({
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

/** Applies field changes while retaining unresolved legacy siblings. */
export function mergeLegacyVizConfigEdit({
  legacy,
  before,
  after,
  columns,
}: Readonly<MergeLegacyVizConfigEditOptions>): VizConfig.NameBound {
  if (legacy.vizType !== after.vizType) {
    return legacy;
  }
  const previous = makeNameBoundVizConfigFromVizConfig({
    config: before,
    columns: columns,
  }).config;
  const edited = makeNameBoundVizConfigFromVizConfig({
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
  return { ...legacy, ...changes, ...series } as VizConfig.NameBound;
}
