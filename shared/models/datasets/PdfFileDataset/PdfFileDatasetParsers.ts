import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  PdfFileDatasetId,
  PdfFileDatasetModel,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  fingerprint: supabaseJSONSchema,
  has_original_file: z.boolean(),
  id: z.uuid(),
  is_in_cloud_storage: z.boolean(),
  llm_model: z.string().nullable(),
  output_mode: z.enum(["natural", "observations"]),
  page_range_end: z.number().nullable(),
  page_range_start: z.number().nullable(),
  regions: supabaseJSONSchema,
  size_in_bytes: z.number(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Validation schemas for the shapes stashed inside the `regions` and
 * `fingerprint` jsonb columns.
 *
 * `DBReadSchema` above must stay structurally equal to the generated
 * database row type (enforced by `ZodConsistencyTests` below), so it can
 * only describe those columns as opaque JSON. These schemas run *after*
 * that boundary, inside `fromDBReadToModelRead`, so a malformed value
 * fails loudly with a `ZodError` naming the bad field instead of being
 * silently accepted and breaking somewhere confusing downstream.
 */
const pdfRegionFragmentSchema = z.object({
  page: z.number().int().nonnegative(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

const pdfRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  // `shape` and `detectionMode` mirror the `datasets__pdf_region_shape` and
  // `datasets__pdf_detection_mode` enums. Those are no longer columns, so
  // Postgres cannot reject a bad value inside the jsonb for us; this is the
  // only thing standing between a typo and a `match` that throws much later,
  // at extraction time, with no clue where the value came from.
  shape: z.enum([
    "grid_table",
    "labelled_graphic",
    "repeating_blocks",
    "prose_measures",
  ]),
  // Absent on every region written before the flag existed, and on any region
  // whose shape the classifier chose, so it is optional rather than defaulted:
  // "the user never touched this" and "the user chose false" are the same
  // thing, and inventing a `false` would only make the stored row longer.
  isShapeUserChosen: z.boolean().optional(),
  detectionMode: z.enum(["tagged", "lattice", "stream", "manual"]),
  fragments: z.array(pdfRegionFragmentSchema).readonly(),
  // Deliberately unvalidated beyond "is an object": each shape's extractor
  // owns the meaning of its own options, and validating them here would put
  // every shape's settings in one place again, which is what this
  // restructure removed.
  options: z.record(z.string(), z.unknown()).default({}),
});
const pdfRegionsSchema = z.array(pdfRegionSchema).readonly();

const pdfTableFingerprintSchema = z.object({
  headers: z.array(z.string()).readonly(),
  shape: z.tuple([z.number().int(), z.number().int()]),
  hash: z.string(),
});

export const PdfFileDatasetParsers =
  makeParserRegistry<PdfFileDatasetModel>().build({
    modelName: "PdfFileDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj) => {
        return Model.make("PdfFileDataset", {
          ...obj,
          datasetId: obj.datasetId as DatasetId,
          id: obj.id as PdfFileDatasetId,
          workspaceId: obj.workspaceId as Workspace.Id,
          regions: pdfRegionsSchema.parse(obj.regions),
          fingerprint: pdfTableFingerprintSchema.parse(obj.fingerprint),
          pageRangeStart: obj.pageRangeStart,
          pageRangeEnd: obj.pageRangeEnd,
        });
      },
    ),
    // The domain types (`PdfRegion[]`, `PdfTableFingerprint`, etc.) are
    // deliberately stronger than the DB's `Json` columns, so they don't
    // structurally satisfy `Json` and need a cast here. This was considered,
    // not overlooked: the write direction is guarded by the SQL `not null`
    // constraints and by whatever produced the value on the way in (the
    // detector/import pipeline), so there's no boundary-validation gap the
    // way there is on the read side.
    fromModelInsertToDBInsert: (data) => {
      return snakeCaseKeysDeep(
        data,
      ) as unknown as PdfFileDatasetModel["DBInsert"];
    },
    fromModelUpdateToDBUpdate: (data) => {
      return snakeCaseKeysDeep(
        data,
      ) as unknown as PdfFileDatasetModel["DBUpdate"];
    },
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = PdfFileDatasetModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
