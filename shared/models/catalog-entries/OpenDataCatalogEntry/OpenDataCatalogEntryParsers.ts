import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type {
  OpenDataCatalogEntryId,
  OpenDataCatalogEntryModel,
  OpenDataCatalogEntryRead,
} from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";
import type { Json } from "$/types/database.types.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  date_of_last_sync: z.iso.datetime({ offset: true }).nullable(),
  date_of_last_update: z.iso.datetime({ offset: true }).nullable(),
  coverage_start_date: z.iso.datetime({ offset: true }).nullable(),
  coverage_end_date: z.iso.datetime({ offset: true }).nullable(),
  parquet_file_name: z.string(),
  display_name: z.string(),
  pipeline_name: z.string(),
  pipeline_run_id: z.string(),
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
});

export const OpenDataCatalogEntryParsers =
  makeParserRegistry<OpenDataCatalogEntryModel>().build({
    modelName: "OpenDataCatalogEntry",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): OpenDataCatalogEntryRead => {
        return {
          ...obj,
          id: obj.id as OpenDataCatalogEntryId,
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
type CRUDTypes = OpenDataCatalogEntryModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
