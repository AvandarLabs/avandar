import { isEpochMs, isISODateString, prop } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";

/**
 * Returns the set of column names that should be treated as dates based on
 * the column's declared `dataType` or a sniff of the first row's value.
 *
 * Shared by every consumer of `VisualizationContainer` so the visualization
 * components see a consistent notion of "which columns are dates" regardless
 * of which app is rendering them.
 */
export function getDateColumns(
  columns: readonly QueryResultColumn[],
  data: UnknownDataFrame,
): ReadonlySet<string> {
  return new Set(
    columns
      .filter((f) => {
        const sampleVal = data[0]?.[f.name];
        return (
          AvaDataType.isTemporal(f.dataType) ||
          isISODateString(sampleVal) ||
          isEpochMs(sampleVal)
        );
      })
      .map(prop("name")),
  );
}
