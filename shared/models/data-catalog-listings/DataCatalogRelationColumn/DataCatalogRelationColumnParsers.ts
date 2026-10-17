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
  DataCatalogRelationColumnId,
  DataCatalogRelationColumnModel,
  DataCatalogRelationColumnRead,
} from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn.types.ts";
import type { DataCatalogListingId } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
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

export const DataCatalogRelationColumnParsers =
  makeParserRegistry<DataCatalogRelationColumnModel>().build({
    modelName: "DataCatalogRelationColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataCatalogRelationColumnRead => {
        const createdAt = obj.createdAt;
        const updatedAt = obj.updatedAt;
        if (createdAt === undefined || updatedAt === undefined) {
          throw new Error(
            "DataCatalogRelationColumn: missing created_at or updated_at from DB",
          );
        }
        return {
          id: obj.id as DataCatalogRelationColumnId,
          catalogListingId: obj.catalogListingId as DataCatalogListingId,
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
type CrudTypes = DataCatalogRelationColumnModel;
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
