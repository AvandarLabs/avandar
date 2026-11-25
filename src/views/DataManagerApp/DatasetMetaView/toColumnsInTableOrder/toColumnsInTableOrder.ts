import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * A dataset's columns in the order its table holds them. Postgres returns
 * an updated row last, so a column whose row changed, such as one converted
 * in place, would otherwise move to the end of the list and the preview.
 */
export function toColumnsInTableOrder<
  Column extends Pick<DatasetColumn.T, "columnIdx">,
>(columns: readonly Column[] | undefined): Column[] | undefined {
  return columns
    ? [...columns].sort((columnA, columnB) => {
        return columnA.columnIdx - columnB.columnIdx;
      })
    : undefined;
}
