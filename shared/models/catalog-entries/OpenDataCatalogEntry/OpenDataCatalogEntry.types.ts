import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Json } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";
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

  /**
   * Parquet object name in storage (e.g. `series.parquet`). Undefined on an
   * `api_resource` entry, which has no pre-converted object.
   */
  parquetFileName: string | undefined;

  /** Display name shown in the catalog UI. */
  displayName: string;

  /** Undefined on an `api_resource` entry, which no pipeline produces. */
  pipelineName: string | undefined;

  /**
   * Undefined on an `api_resource` entry, for the same reason as
   * `pipelineName`.
   */
  pipelineRunId: string | undefined;

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

  /** Which of the two access shapes below this entry uses. */
  accessKind: OpenDataAccessKind;

  /**
   * The API protocol to speak. Undefined unless `accessKind` is
   * `api_resource`.
   */
  apiService: OpenDataApiService | undefined;

  /** Root of the API serving this resource (e.g. `https://data.humdata.org`). */
  apiBaseUrl: string | undefined;

  /**
   * Which resource inside the external dataset this entry describes. Never
   * inferred: a CKAN dataset routinely lists a readme ahead of its data, so
   * there is no safe "first resource" default.
   */
  apiResourceId: string | undefined;

  /**
   * The resource format the API reported when this entry was written (e.g.
   * `CSV`). A cache, so readability is checkable without a network call; the
   * live value stays authoritative.
   */
  apiResourceFormat: string | undefined;
};

/**
 * How an entry's rows are reached. Mirrors the database enum of the same
 * name.
 */
export type OpenDataAccessKind = "pipeline_parquet" | "api_resource";

/** The API protocol an `api_resource` entry speaks, not the host serving it. */
export type OpenDataApiService = "ckan";

/**
 * An entry's access shape, with the null checks already done. Every member is
 * complete by construction, so a consumer switches on `kind` instead of
 * testing four fields. `OpenDataCatalogEntry.toAccess` is what produces one.
 */
export type OpenDataAccess =
  | {
      kind: "pipeline_parquet";
      parquetFileName: string;
      pipelineName: string;
      pipelineRunId: string;
    }
  | {
      kind: "api_resource";
      apiService: OpenDataApiService;
      apiBaseUrl: string;
      /** The CKAN dataset containing the resource, by slug or id. */
      ckanDatasetId: string;
      ckanResourceId: string;
      /** The format recorded when the entry was written. */
      expectedFormat: string;
    };

/**
 * CRUD type definitions for the OpenDataCatalogEntry model.
 */
export type OpenDataCatalogEntryModel = SupabaseCrudModelSpec<
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
