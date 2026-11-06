import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Json } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type DataCatalogListingId = UUID<"DataCatalogListing">;

export type DataCatalogListingRead = {
  /** Unique identifier for this catalog listing. */
  id: DataCatalogListingId;

  createdAt: string;

  updatedAt: string;

  /** When this dataset was last synced from its raw source. */
  dateOfLastSync: string | undefined;

  /**
   * When the source last modified this dataset, as its API reports it.
   * Incremental pipeline runs resume from the newest value per pipeline and
   * drive.
   */
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

  /**
   * The pipeline that last wrote this listing. Undefined on a listing no
   * pipeline produces, such as a hand-curated `api_resource` listing.
   */
  pipelineName: string | undefined;

  /** The pipeline run that last wrote this listing, when there is one. */
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

  /**
   * Where this entry's cached copy lives in the `open-data-catalog` bucket.
   * Undefined until the first successful fetch. Only ever set on an
   * `api_resource` entry.
   */
  cachedObjectPath: string | undefined;

  /**
   * The freshness token captured when the cache was last written. Compared
   * against a live metadata read, never parsed.
   */
  cachedSourceVersion: string | undefined;

  /** When the cache was last written. Informational only. */
  cachedAt: string | undefined;

  /**
   * The scopes of `pipelineName` that produce this listing. Empty on a
   * listing no scoped pipeline wrote.
   */
  pipelineScopeKeys: string[];

  /**
   * When the types of this entry's relation columns were last verified
   * against a sample of the source's real data. Undefined when they never
   * were, in which case every column is text.
   */
  dateColumnTypeLastVerified: string | undefined;

  /**
   * Whether this entry's dataset cannot be loaded, as found when a sample of
   * it was last read.
   */
  isInvalid: boolean;

  /** Why the dataset cannot be loaded. Set exactly when `isInvalid` is. */
  invalidDatasetReason: InvalidDatasetReason | undefined;

  /**
   * Whether a workspace can add this entry. False for an asset Avandar
   * cannot read yet, such as a map or a PDF, which is still listed so it
   * can be found and opened at `sourceUrl`.
   */
  isWorkspaceLoadable: boolean;

  /**
   * The source's own name for the kind of asset this is, such as Socrata's
   * `map` or `file`.
   */
  sourceAssetType: string | undefined;

  /** Where the asset's bytes can be downloaded, when the source says. */
  sourceDownloadUrl: string | undefined;
};

/**
 * Why an entry's dataset cannot be loaded. Mirrors the database enum
 * `data_catalog_listings__invalid_dataset_reason`.
 */
export type InvalidDatasetReason =
  | "empty_dataset"
  | "dataset_not_found"
  | "authorization_required"
  | "unsupported_format"
  | "external_host"
  | "unparseable_dataset"
  | "unreachable_dataset";

/**
 * How an entry's rows are reached. Mirrors the database enum of the same
 * name.
 */
export type OpenDataAccessKind = "pipeline_parquet" | "api_resource";

/** The API protocol an `api_resource` entry speaks, not the host serving it. */
export type OpenDataApiService = "ckan" | "socrata";

/**
 * An entry's access shape, with the null checks already done. Every member is
 * complete by construction, so a consumer switches on `kind` instead of
 * testing four fields. `DataCatalogListing.toAccess` is what produces one.
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
      /** The external dataset containing the resource, by slug or id. */
      externalDatasetId: string;
      apiResourceId: string;
      /** The format recorded when the entry was written. */
      expectedFormat: string;
    };

/**
 * CRUD type definitions for the DataCatalogListing model.
 */
export type DataCatalogListingModel = SupabaseCrudModelSpec<
  {
    tableName: "data_catalog_listings";
    modelName: "DataCatalogListing";
    modelPrimaryKeyType: DataCatalogListingId;
    modelTypes: {
      Read: DataCatalogListingRead;
      Insert: SetOptional<
        DataCatalogListingRead,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "isInvalid"
        | "invalidDatasetReason"
        | "isWorkspaceLoadable"
      >;
      Update: Partial<DataCatalogListingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
