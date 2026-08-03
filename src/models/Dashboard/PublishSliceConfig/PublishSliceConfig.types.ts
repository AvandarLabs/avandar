import { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Internal union backing `PublishSliceConfig.RowFilter`. */
export type PublishSliceRowFilter =
  | {
      /** Stable identifier used while filters are reordered or removed. */
      id?: string;
      kind: "enum";
      columnName: string;
      values: readonly string[];
    }
  | {
      /** Stable identifier used while filters are reordered or removed. */
      id?: string;
      kind: "range_number";
      columnName: string;
      min?: number;
      max?: number;
    }
  | {
      /** Stable identifier used while filters are reordered or removed. */
      id?: string;
      kind: "range_date";
      columnName: string;
      start?: string;
      end?: string;
    };

/** Internal union backing `PublishSliceConfig.T`. */
export type PublishSliceConfigRead =
  | { mode: "queried" }
  | { mode: "all_columns" }
  | {
      mode: "custom";
      columns: readonly string[];
      rowFilters: readonly PublishSliceRowFilter[];
    };

/** Internal shape backing `PublishSliceConfig.Dashboard`. */
export type DashboardPublishConfig = {
  /** Per-dataset slice. Missing entries default to `{ mode: "queried" }`. */
  slices: Record<Dataset.Id, PublishSliceConfigRead>;
};
