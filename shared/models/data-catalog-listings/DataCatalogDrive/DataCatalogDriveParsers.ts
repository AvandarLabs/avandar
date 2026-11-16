import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import type {
  DataCatalogDriveId,
  DataCatalogDriveModel,
  DataCatalogDriveRead,
} from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  pipeline_name: z.string(),
  drive_key: z.string(),
  organization1_label: z.string().nullable(),
  organization2_label: z.string().nullable(),
  organization3_label: z.string().nullable(),
  organization4_label: z.string().nullable(),
});

export const DataCatalogDriveParsers =
  makeParserRegistry<DataCatalogDriveModel>().build({
    modelName: "DataCatalogDrive",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataCatalogDriveRead => {
        return { ...obj, id: obj.id as DataCatalogDriveId };
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = DataCatalogDriveModel;
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
