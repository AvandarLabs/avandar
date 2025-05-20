import { UUID } from "@/lib/types/common";

export type FieldDataType = "string" | "number" | "date" | "unknown";
export type LocalDatasetFieldId = UUID<"LocalDatasetField">;

/**
 * Represents a field in a LocalDataset. This type is used in both IndexedDB
 * and the frontend, no conversions are necessary.
 */
// TODO(jpsyx): rename this to LocalDatasetColumn
export type LocalDatasetField = {
  id: LocalDatasetFieldId;

  /**
   * The name of this field as it is stored in a CSV column.
   */
  name: string;
  dataType: FieldDataType;
  description?: string | undefined;
};
