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
  CatalogListingColumnId,
  CatalogListingColumnModel,
  CatalogListingColumnRead,
} from "$/models/catalog-listings/CatalogListingColumn/CatalogListingColumn.types.ts";
import type { OpenDataCatalogListingId } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  catalog_listing_id: z.uuid(),
  column_name: z.string(),
  display_order: z.number().nullable(),
  created_at: z.iso.datetime({ offset: true }).nullable(),
  updated_at: z.iso.datetime({ offset: true }).nullable(),
  original_data_type: z.string(),
  cast_data_type: z.enum(DuckDbDataTypes),
});

export const CatalogListingColumnParsers =
  makeParserRegistry<CatalogListingColumnModel>().build({
    modelName: "CatalogListingColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): CatalogListingColumnRead => {
        const createdAt = obj.createdAt;
        const updatedAt = obj.updatedAt;
        if (createdAt === undefined || updatedAt === undefined) {
          throw new Error(
            "CatalogListingColumn: missing created_at or updated_at from DB",
          );
        }
        return {
          id: obj.id as CatalogListingColumnId,
          catalogListingId: obj.catalogListingId as OpenDataCatalogListingId,
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
type CrudTypes = CatalogListingColumnModel;
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
