import type { UUID } from "@utils/types/common.types.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { Json } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

export type OpenDataCatalogEntryId = UUID<"OpenDataCatalogEntry">;

export type OpenDataCatalogEntryRead = {
  /** Unique identifier for this catalog entry. */
  id: OpenDataCatalogEntryId;

  createdAt: string;

  updatedAt: string;

  /** When this dataset was last synced from its raw source. */
  dateOfLastSync: string | undefined;

  /** Last update date from the dataset or API. */
  dateOfLastUpdate: string | undefined;

  coverageStartDate: string | undefined;

  coverageEndDate: string | undefined;

  datasetName: string;

  pipelineName: string;

  pipelineRunId: string;

  externalOrganizationName: string;

  externalServiceName: string | undefined;

  externalDatasetId: string | undefined;

  sourceUrl: string | undefined;

  canonicalUrls: string[] | undefined;

  license: string | undefined;

  updateFrequency: string | undefined;

  description: string | undefined;

  notes: string | undefined;

  metadata: Json | undefined;
};

/**
 * CRUD type definitions for the OpenDataCatalogEntry model.
 */
export type OpenDataCatalogEntryModel = SupabaseCRUDModelSpec<
  {
    tableName: "catalog_entries__open_data";
    modelName: "OpenDataCatalogEntry";
    modelPrimaryKeyType: OpenDataCatalogEntryId;
    modelTypes: {
      Read: OpenDataCatalogEntryRead;
      Insert: SetOptional<
        OpenDataCatalogEntryRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<OpenDataCatalogEntryRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type OpenDataCatalogEntry<
  K extends keyof OpenDataCatalogEntryModel = "Read",
> = OpenDataCatalogEntryModel[K];
