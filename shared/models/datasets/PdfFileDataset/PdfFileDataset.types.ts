import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

type ModelType = "PdfFileDataset";
export type PdfFileDatasetId = UUID<ModelType>;

/** How a PDF table's structure was determined. */
export type PdfDetectionMode = "tagged" | "lattice" | "stream" | "manual";

/**
 * A rectangle on one page, in PDF user-space points with the origin at the
 * bottom-left, matching pdf.js's coordinate system.
 */
export type PdfTableRegion = {
  /** Zero-based page index. */
  page: number;
  /** `[x0, y0, x1, y1]`, bottom-left and top-right corners. */
  bbox: readonly [number, number, number, number];
};

/**
 * Snapshot of the extracted table taken at import time. Compared against a
 * fresh extraction on re-parse so drift is reported rather than silently
 * applied.
 */
export type PdfTableFingerprint = {
  headers: readonly string[];
  shape: readonly [rowCount: number, columnCount: number];
  hash: string;
};

export type PdfFileDatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset was created. */
    createdAt: string;

    /** Unique identifier of the dataset. */
    datasetId: DatasetId;

    /** Unique identifier of the PDF file dataset in our system. */
    id: PdfFileDatasetId;

    /** Timestamp of when the dataset was last updated. */
    updatedAt: string;

    /** Unique identifier of the workspace the dataset belongs to. */
    workspaceId: Workspace.Id;

    /** If true, the parquet is persisted in cloud storage. */
    isInCloudStorage: boolean;

    /** Size of the source PDF in bytes. */
    sizeInBytes: number;

    /** Whether the original PDF was retained. */
    hasOriginalFile: boolean;

    /** Page fragments the table occupies, in reading order. */
    regions: readonly PdfTableRegion[];

    /** Which detection signal produced this table. */
    detectionMode: PdfDetectionMode;

    /** Snapped column boundaries; undefined for `tagged`. */
    gridX: readonly number[] | undefined;

    /** Snapped row boundaries; undefined for `tagged`. */
    gridY: readonly number[] | undefined;

    /** First page detection was limited to, inclusive and zero-based. */
    pageRangeStart: number | undefined;

    /** Last page detection was limited to, inclusive and zero-based. */
    pageRangeEnd: number | undefined;

    /** Number of leading rows treated as header. */
    headerRows: number;

    /** Whether merged cells are filled down into every row they span. */
    fillMergedCells: boolean;

    /** Drift-detection snapshot taken at import time. */
    fingerprint: PdfTableFingerprint;
  }
>;

/**
 * CRUD type definitions for the PdfFileDataset model.
 */
export type PdfFileDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "datasets__pdf_file";
    modelName: "PdfFileDataset";
    modelPrimaryKeyType: PdfFileDatasetId;
    modelTypes: {
      Read: PdfFileDatasetRead;
      Insert: SetOptional<
        PdfFileDatasetRead,
        "createdAt" | "id" | "updatedAt"
      >;
      Update: Partial<PdfFileDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
