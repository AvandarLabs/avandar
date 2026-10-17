import { bindLegacyVizConfig } from "$/models/vizs/bindLegacyVizConfig/bindLegacyVizConfig";
import { resolveVizColumnBindings } from "$/models/vizs/resolveVizColumnBindings/resolveVizColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";

type SeriesConfig = Extract<
  VizConfig.Legacy,
  { series: ReadonlyArray<{ key: string }> }
>;

function _mergeSeries(
  legacy: SeriesConfig,
  edited: SeriesConfig,
  columns: readonly QueryResult.BoundColumn[],
): SeriesConfig["series"] {
  let resolvedIndex = 0;
  const series = legacy.series.flatMap((original) => {
    const single = { ...legacy, series: [original] } as SeriesConfig;
    const bound = bindLegacyVizConfig(single, columns).config;
    if (!("series" in bound) || bound.series.length === 0) {
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
export function mergeLegacyVizConfigEdit(
  legacy: VizConfig.Legacy,
  before: VizConfig.T,
  after: VizConfig.T,
  columns: readonly QueryResult.BoundColumn[],
): VizConfig.Legacy {
  if (legacy.vizType !== after.vizType) {
    return legacy;
  }
  const previous = resolveVizColumnBindings(before, columns).config;
  const edited = resolveVizColumnBindings(after, columns);
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
      ? { series: _mergeSeries(legacy, edited.config, columns) }
      : {};
  // The edit keeps the discriminant and changes only fields of that chart.
  return { ...legacy, ...changes, ...series } as VizConfig.Legacy;
}
