import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { DuckDbDataTypes } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type {
  CatalogDatasetColumnId,
  CatalogDatasetColumnModel,
  CatalogDatasetColumnRead,
} from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumn.types.ts";
import type { OpenDataCatalogEntryId } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";

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
