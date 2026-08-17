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
  PdfTableFingerprint,
  PdfTableRegion,
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
  page_range: z.unknown(),
  regions: supabaseJSONSchema,
  size_in_bytes: z.number(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
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
          regions: obj.regions as unknown as readonly PdfTableRegion[],
          fingerprint: obj.fingerprint as unknown as PdfTableFingerprint,
          gridX: obj.gridX as unknown as readonly number[] | undefined,
          gridY: obj.gridY as unknown as readonly number[] | undefined,
          pageRange: obj.pageRange as
            | readonly [number, number]
            | undefined,
        });
      },
    ),
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
