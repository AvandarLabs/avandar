import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import { camelCaseKeysDeep, pipe, snakeCaseKeysDeep } from "@avandar/utils";
import { z } from "zod";
import type { DataCatalogListingId } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  OpenDataDatasetId,
  OpenDataDatasetModel,
} from "$/models/datasets/OpenDataDataset/OpenDataDataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  dataset_id: z.uuid(),
  workspace_id: z.uuid(),
  catalog_listing_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const OpenDataDatasetParsers =
  makeParserRegistry<OpenDataDatasetModel>().build({
    modelName: "OpenDataDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(camelCaseKeysDeep, (obj) => {
      return Model.make("OpenDataDataset", {
        ...obj,
        id: obj.id as OpenDataDatasetId,
        datasetId: obj.datasetId as DatasetId,
        workspaceId: obj.workspaceId as Workspace.Id,
        catalogListingId: obj.catalogListingId as DataCatalogListingId,
      });
    }),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = OpenDataDatasetModel;
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
