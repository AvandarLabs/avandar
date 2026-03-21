import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeysDeep/camelCaseKeysDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeysDeep/snakeCaseKeysDeep.ts";
import { z } from "zod";
import type { DatasetId } from "../Dataset/Dataset.types.ts";
import type {
  GoogleSheetsDatasetId,
  GoogleSheetsDatasetModel,
} from "./GoogleSheetsDataset.types.ts";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  google_document_id: z.string(),
  google_account_id: z.uuid(),
  id: z.uuid(),
  rows_to_skip: z.number(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const GoogleSheetsDatasetParsers =
  makeParserRegistry<GoogleSheetsDatasetModel>().build({
    modelName: "GoogleSheetsDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(camelCaseKeysDeep, (obj) => {
      return {
        ...obj,
        id: obj.id as GoogleSheetsDatasetId,
        datasetId: obj.datasetId as DatasetId,
        workspaceId: obj.workspaceId as Workspace.Id,
      };
    }),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = GoogleSheetsDatasetModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
