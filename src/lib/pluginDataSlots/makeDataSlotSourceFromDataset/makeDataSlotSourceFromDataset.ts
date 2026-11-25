import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * Makes the data slot source for a dataset: one field per column, in column
 * order. A column's `name` is both its label and its column in the
 * dataset's DuckDB relation.
 */
export function makeDataSlotSourceFromDataset(
  options: Readonly<{
    dataset: Dataset.T;
    columns: readonly DatasetColumn.T[];
  }>,
): DataSlotSource {
  const fields = [...options.columns]
    .sort((columnA, columnB) => {
      return columnA.columnIdx - columnB.columnIdx;
    })
    .map((column): DataSlotSourceField => {
      return {
        id: column.id,
        columnName: column.name,
        label: column.name,
        dataType: column.dataType,
      };
    });
  return {
    kind: "dataset",
    datasetId: options.dataset.id,
    name: options.dataset.name,
    fields,
  };
}
