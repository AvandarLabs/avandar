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

/** How several extracted regions combine into one dataset. */
export type PdfOutputMode = "natural" | "observations";

/*
 * The region types below live here, rather than beside the extraction code in
 * `src/workers/pdfSniff/types.ts`, for two reasons:
 *
 * 1. They are the persisted contract. They describe exactly what is stored in
 *    the `datasets__pdf_file.regions` jsonb column, so they belong next to
 *    the rest of this model, and the Zod schema in `PdfFileDatasetParsers.ts`
 *    validates against them at the DB boundary.
 * 2. `shared/` must stay resolvable under Deno. `pnpm type-check` runs
 *    `deno check shared`, and the Deno import map (`/deno.json`) maps `$/` to
 *    `shared/` but has no `@/` entry at all, so nothing here can import from
 *    `src/`. Defining them in `src/` and importing them back would not
 *    type-check, and would also be a cycle: `pdfSniff/types.ts` already
 *    imports `PdfDetectionMode` from this file.
 *
 * `src/workers/pdfSniff/types.ts` re-exports these, so worker-side code can
 * keep importing them from there. Please do not move them back.
 */

/** `[x0, y0, x1, y1]`, bottom-left and top-right, in PDF points. */
export type BBox = readonly [number, number, number, number];

/** What kind of content a region holds, which decides how it is extracted. */
export type PdfRegionShape =
  | "grid_table"
  | "labelled_graphic"
  | "repeating_blocks"
  | "prose_measures";

/**
 * One page's worth of a region. A region spanning pages has several.
 *
 * The rectangle is in PDF user-space points with the origin at the
 * bottom-left, matching pdf.js's coordinate system.
 */
export type PdfRegionFragment = {
  /** Zero-based, matching `PageGeometry.pageIndex`. */
  page: number;
  bbox: BBox;
};

/**
 * A rectangle (or text run) the user or a detector has marked for extraction.
 *
 * Deliberately carries resolved geometry rather than an ordinal like
 * "table 3". A sheet name is an identity Excel guarantees; a table ordinal is
 * an output of our own detector, so improving detection could silently
 * repoint a saved dataset at different data.
 */
export type PdfRegion = {
  id: string;
  /** User-editable. Prefixes column names when regions are combined. */
  label: string;
  /**
   * How this region is read.
   *
   * Whoever wrote it last: the classifier on every extraction, unless
   * `isShapeUserChosen` says the user has taken it over. It is stored rather
   * than derived so that the dropdown has something to show before the first
   * extraction comes back, and so that a saved dataset records what it was
   * actually read as.
   */
  shape: PdfRegionShape;
  /**
   * True once the user has picked the shape themselves.
   *
   * This is the difference between a shape we chose and a shape we were told,
   * and without it there is no way to tell them apart: both are just a value
   * in `shape`. The classifier re-runs on every extraction, so a region
   * carrying a default would be re-classified for ever, while one carrying a
   * user's choice must never be. Persisted for the same reason it exists: on
   * reload, a re-classification must not quietly undo what the user chose.
   */
  isShapeUserChosen?: boolean;
  detectionMode: PdfDetectionMode;
  fragments: readonly PdfRegionFragment[];
  /**
   * Shape-specific settings, read only by the matching extractor. Grid
   * coordinates, header row count, merged-cell fill and ambiguity threshold
   * all live here rather than as columns, because one dataset can hold
   * regions of different shapes for which those settings mean different
   * things or nothing at all.
   */
  options: Readonly<Record<string, unknown>>;
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

    /**
     * What was extracted and where it physically sits. One entry per region,
     * so a dataset built from a map plus a KPI row has two.
     */
    regions: readonly PdfRegion[];

    /** How the regions combine into one dataset. */
    outputMode: PdfOutputMode;

    /**
     * Which model produced any model-extracted rows, or undefined when the
     * rows came from rules alone. Stored rather than inferred because the
     * workspace privacy log must be able to answer "did a model see this
     * document" from the dataset row alone.
     */
    llmModel: string | undefined;

    /** First page detection was limited to, inclusive and zero-based. */
    pageRangeStart: number | undefined;

    /** Last page detection was limited to, inclusive and zero-based. */
    pageRangeEnd: number | undefined;

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
      Insert: SetOptional<PdfFileDatasetRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<PdfFileDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
