import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import { DuckDbDataTypes } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";
import type {
  CatalogDatasetColumnId,
  CatalogDatasetColumnModel,
  CatalogDatasetColumnRead,
} from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumn.types.ts";
import type { OpenDataCatalogEntryId } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  catalog_entry_id: z.uuid(),
  column_name: z.string(),
  display_order: z.number().nullable(),
  created_at: z.iso.datetime({ offset: true }).nullable(),
  updated_at: z.iso.datetime({ offset: true }).nullable(),
  original_data_type: z.string(),
  cast_data_type: z.enum(DuckDbDataTypes),
});

export const CatalogDatasetColumnParsers =
  makeParserRegistry<CatalogDatasetColumnModel>().build({
    modelName: "CatalogDatasetColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): CatalogDatasetColumnRead => {
        const createdAt = obj.createdAt;
        const updatedAt = obj.updatedAt;
        if (createdAt === undefined || updatedAt === undefined) {
          throw new Error(
            "CatalogDatasetColumn: missing created_at or updated_at from DB",
          );
        }
        return {
          id: obj.id as CatalogDatasetColumnId,
          catalogEntryId: obj.catalogEntryId as OpenDataCatalogEntryId,
          columnName: obj.columnName,
          displayOrder: obj.displayOrder,
          createdAt,
          updatedAt,
          originalDataType: obj.originalDataType,
          castDataType: obj.castDataType,
        };
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = CatalogDatasetColumnModel;
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
