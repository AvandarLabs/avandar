import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";

/** Workspace dataset + columns used to label SQL tokens for display. */
export type SqlDisplayCatalog = {
  datasets: ReadonlyArray<{
    id: DatasetId;
    name: string;
    columns: ReadonlyArray<{ name: string }>;
  }>;
};

/**
 * One contiguous piece of rendered SQL: plain text, a dataset pill, or a
 * column pill.
 */
export type SqlDisplaySegment =
  | { kind: "text"; value: string }
  | {
      kind: "dataset";
      datasetId: DatasetId;
      /** Human-readable label (dataset name). */
      label: string;
      /** Exact substring in the SQL string (e.g. quoted id). */
      raw: string;
      start: number;
      end: number;
    }
  | {
      kind: "column";
      name: string;
      label: string;
      raw: string;
      start: number;
      end: number;
    };
