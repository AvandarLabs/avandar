import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
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
  detection_mode: z.enum(["tagged", "lattice", "stream", "manual"]),
  fill_merged_cells: z.boolean(),
  fingerprint: supabaseJSONSchema,
  grid_x: supabaseJSONSchema.nullable(),
  grid_y: supabaseJSONSchema.nullable(),
  has_original_file: z.boolean(),
  header_rows: z.number(),
  id: z.uuid(),
  is_in_cloud_storage: z.boolean(),
  page_range_end: z.number().nullable(),
  page_range_start: z.number().nullable(),
  regions: supabaseJSONSchema,
  size_in_bytes: z.number(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Validation schemas for the shapes stashed inside the `regions`,
 * `fingerprint`, `grid_x`, and `grid_y` jsonb columns.
 *
 * `DBReadSchema` above must stay structurally equal to the generated
 * database row type (enforced by `ZodConsistencyTests` below), so it can
 * only describe those columns as opaque JSON. These schemas run *after*
 * that boundary, inside `fromDBReadToModelRead`, so a malformed value
 * fails loudly with a `ZodError` naming the bad field instead of being
 * silently accepted and breaking somewhere confusing downstream.
 */
const pdfTableRegionSchema = z.object({
  page: z.number().int().nonnegative(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
const pdfTableRegionsSchema = z.array(pdfTableRegionSchema).readonly();

const pdfTableFingerprintSchema = z.object({
  headers: z.array(z.string()).readonly(),
  shape: z.tuple([z.number().int(), z.number().int()]),
  hash: z.string(),
});

const gridCoordinatesSchema = z.array(z.number()).readonly();

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
          regions: pdfTableRegionsSchema.parse(obj.regions),
          fingerprint: pdfTableFingerprintSchema.parse(obj.fingerprint),
          gridX:
            obj.gridX === undefined
              ? undefined
              : gridCoordinatesSchema.parse(obj.gridX),
          gridY:
            obj.gridY === undefined
              ? undefined
              : gridCoordinatesSchema.parse(obj.gridY),
          pageRangeStart: obj.pageRangeStart,
          pageRangeEnd: obj.pageRangeEnd,
        });
      },
    ),
    // The domain types (`PdfTableRegion[]`, `PdfTableFingerprint`, etc.) are
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
