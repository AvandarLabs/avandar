import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import type {
  DataCatalogListingId,
  DataCatalogListingModel,
  DataCatalogListingRead,
} from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  date_of_last_sync: z.iso.datetime({ offset: true }).nullable(),
  date_of_last_update: z.iso.datetime({ offset: true }).nullable(),
  coverage_start_date: z.iso.datetime({ offset: true }).nullable(),
  coverage_end_date: z.iso.datetime({ offset: true }).nullable(),
  parquet_file_name: z.string().nullable(),
  display_name: z.string(),
  pipeline_name: z.string().nullable(),
  pipeline_run_id: z.string().nullable(),
  external_organization_name: z.string(),
  external_service_name: z.string().nullable(),
  external_dataset_id: z.string().nullable(),
  source_url: z.string().nullable(),
  canonical_urls: z.array(z.string()).nullable(),
  license: z.string().nullable(),
  update_frequency: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: supabaseJSONSchema.nullable(),
  access_kind: z.enum(["pipeline_parquet", "api_resource"]),
  api_service: z.enum(["ckan", "socrata"]).nullable(),
  api_base_url: z.string().nullable(),
  api_resource_id: z.string().nullable(),
  api_resource_format: z.string().nullable(),
  cached_object_path: z.string().nullable(),
  cached_source_version: z.string().nullable(),
  cached_at: z.iso.datetime({ offset: true }).nullable(),
  pipeline_scope_keys: z.array(z.string()),
  date_column_type_last_verified: z.iso.datetime({ offset: true }).nullable(),
});

export const DataCatalogListingParsers =
  makeParserRegistry<DataCatalogListingModel>().build({
    modelName: "DataCatalogListing",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataCatalogListingRead => {
        return {
          ...obj,
          id: obj.id as DataCatalogListingId,
          metadata: obj.metadata as Json | undefined,
        };
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = DataCatalogListingModel;
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
