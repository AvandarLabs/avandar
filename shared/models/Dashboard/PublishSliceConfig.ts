/**
 * Publish-time slice configuration. When a dashboard is published, the
 * editor uploads parquet blobs for each dependent dataset into the public
 * bucket. The slice config controls *what* of each dataset goes into that
 * blob:
 *
 *   - "queried": only the columns referenced by the dashboard's DataViz
 *     queries + any FilterPBlock columns, all rows. This is the narrowest
 *     default and the one most aligned with "publish only what the
 *     dashboard reads".
 *   - "all_columns": every column the dataset has, all rows.
 *   - "custom": an explicit column allow-list + row filters.
 *
 * Slice config is stored *inside* `dashboard.config` (the Puck JSON blob)
 * under the sibling key `__publishConfig`. That keeps the storage in
 * existing infrastructure (no new column, no migration) and travels with
 * dashboard saves naturally.
 */
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";

export type PublishSliceRowFilter =
  | {
      kind: "enum";
      columnName: string;
      values: readonly string[];
    }
  | {
      kind: "range_number";
      columnName: string;
      min?: number;
      max?: number;
    }
  | {
      kind: "range_date";
      columnName: string;
      start?: string;
      end?: string;
    };

export type PublishSliceConfig =
  | { mode: "queried" }
  | { mode: "all_columns" }
  | {
      mode: "custom";
      columns: readonly string[];
      rowFilters: readonly PublishSliceRowFilter[];
    };

export type DashboardPublishConfig = {
  /** Per-dataset slice. Missing entries default to `{ mode: "queried" }`. */
  slices: Record<DatasetId, PublishSliceConfig>;
};

export const DEFAULT_PUBLISH_SLICE: PublishSliceConfig = { mode: "queried" };
