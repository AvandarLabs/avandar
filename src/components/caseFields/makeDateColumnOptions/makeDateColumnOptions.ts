import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

/** One date column a per-period field can group its rows by. */
export type DateColumnOption = { value: string; label: string };

/**
 * The date and timestamp columns among a dataset's columns, as options for a
 * date column picker. For example, built from the columns a draft card or a
 * form already loaded for a field's dataset.
 */
export function makeDateColumnOptions(
  columns: ReadonlyArray<{ id: string; name: string; dataType: AvaDataType.T }>,
): DateColumnOption[] {
  return columns
    .filter((column) => {
      return ConceptAttribute.isBucketDateColumnType(column.dataType);
    })
    .map((column) => {
      return { value: column.id, label: column.name };
    });
}
