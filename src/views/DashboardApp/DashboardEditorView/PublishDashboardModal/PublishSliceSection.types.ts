import { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** Dataset metadata needed by publication-slice controls. */
export type PublishSliceDataset = {
  id: Dataset.Id;
  name: string;
  columns: readonly DatasetColumn.T[];
  queriedColumns: readonly string[];
  treatAsAllColumns: boolean;
};

/** Column metadata needed to select a supported row-filter editor. */
export type FilterableColumn = {
  name: string;
  type: AvaDataType.T;
};
