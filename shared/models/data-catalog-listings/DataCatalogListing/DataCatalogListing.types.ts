import type { DataCatalogDriveId } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive.types.ts";
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

  organization1Name: string;

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

  /** Deeper organization levels, inside `organization1Name`. */
  organization2Name: string | undefined;
  organization3Name: string | undefined;
  organization4Name: string | undefined;

  /** Subject areas the source files the dataset under. */
  domains: string[] | undefined;

  /** The source's free-form keywords. */
  tags: string[] | undefined;

  /**
   * What the source record the listing was built from says that no other
   * field holds. A field the pipeline maps elsewhere is left out.
   */
  additionalSourceMetadata: Json | undefined;

  /** The drive that produced the listing. */
  driveId: DataCatalogDriveId | undefined;

  /**
   * Where this listing's Parquet copy stands. Undefined until a build is
   * first requested. Only ever set on an `api_resource` listing.
   */
  parquetCacheStatus: ParquetCacheStatus | undefined;

  /**
   * The running build's id, which the build passes back to record its
   * result. Undefined when no build runs.
   */
  parquetCacheBuildId: string | undefined;

  /** When the running or last build started. */
  parquetCacheBuildStartedAt: string | undefined;

  /** Why the last build failed. Set exactly when the status is `failed`. */
  parquetCacheFailureCode: string | undefined;

  /**
   * The public `opendata` bucket folder holding the Parquet copy, as
   * `part-00000.parquet` onward. The copy fields below are set together or
   * not at all.
   */
  parquetCacheFolderPath: string | undefined;

  /** How many parts the copy's folder holds. */
  parquetCachePartCount: number | undefined;

  /** The source's freshness token when the copy was built. Never parsed. */
  parquetCacheSourceVersion: string | undefined;

  /** When the copy was written. */
  parquetCacheBuiltAt: string | undefined;

  /** How many rows the copy holds. */
  parquetCacheRowCount: number | undefined;

  /** The copy's size in bytes. */
  parquetCacheByteSize: number | undefined;
};

/**
 * One listing as catalog search returns it: only the columns the catalog's
 * list shows. The detail pane reads the full listing by id.
 */
export type DataCatalogListingSearchResult = Pick<
  DataCatalogListingRead,
  | "id"
  | "displayName"
  | "organization1Name"
  | "organization2Name"
  | "organization3Name"
  | "organization4Name"
  | "pipelineName"
  | "isWorkspaceLoadable"
  | "isInvalid"
> & {
  /** The file format upper-cased, `PARQUET` for a pipeline file. */
  fileFormat: string | undefined;

  /**
   * When the listing last changed: the source's own update date, otherwise
   * Avandar's last sync. What the update filter and sort read.
   */
  lastUpdatedAt: string | undefined;
};

/**
 * How recently a listing must have changed. The windows are cumulative: a
 * listing updated last week is also within the past year.
 */
export type DataCatalogListingUpdatedWithin =
  | "any"
  | "pastMonth"
  | "pastYear"
  | "overAYear";

/** The order catalog search lists its results in. */
export type DataCatalogListingSortBy = "relevance" | "updated" | "name";

/**
 * The narrowing applied to a catalog search. Values inside one facet are
 * alternatives; separate facets must all match.
 */
export type DataCatalogListingSearchFilters = {
  /**
   * Level-1 organizations (`organization1Name`) to keep. Empty keeps every
   * source.
   */
  sources: string[];

  /**
   * Level-2 organizations (`organization2Name`) to keep. Empty keeps every
   * listing.
   */
  organization2Names: string[];

  /** Subject areas (`domains`) to keep. Empty keeps every listing. */
  domains: string[];

  /** Keywords (`tags`) to keep. Empty keeps every listing. */
  tags: string[];

  /** Upper-cased file formats to keep. Empty keeps every format. */
  formats: string[];

  updatedWithin: DataCatalogListingUpdatedWithin;

  /** Whether listings whose dataset cannot be loaded are hidden. */
  isLoadableOnly: boolean;
};

/**
 * One choosable value of a facet and how many listings it would keep. The
 * count is undefined where too many listings match to count them quickly.
 */
export type DataCatalogListingFacetOption = {
  value: string;
  count: number | undefined;
};

/**
 * What each search filter would keep, each counted against every other
 * filter but not itself.
 */
export type DataCatalogListingSearchFacets = {
  sources: DataCatalogListingFacetOption[];

  /** Level-2 organizations the listings in view belong to. */
  organization2: DataCatalogListingFacetOption[];

  /**
   * What the drives call the level-2 organizations in view (such as
   * "Agency"), the label with the most listings first.
   */
  organization2Labels: string[];

  /** Subject areas the listings in view are filed under. */
  domains: DataCatalogListingFacetOption[];

  /** The sources' free-form keywords on the listings in view. */
  tags: DataCatalogListingFacetOption[];
  formats: DataCatalogListingFacetOption[];
  /** Undefined for a window too many listings match to count quickly. */
  updatedWithin: Record<DataCatalogListingUpdatedWithin, number | undefined>;

  /**
   * Unloadable listings that match everything except loadable-only, or
   * undefined where too many listings match to count them quickly.
   */
  numUnloadable: number | undefined;

  /** Every listing in the catalog, unsearched and unfiltered. */
  numCatalogListings: number;
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
 * Where an `api_resource` listing's Parquet copy stands. Mirrors the
 * database enum `data_catalog_listings__parquet_cache_status`.
 */
export type ParquetCacheStatus = "building" | "ready" | "failed";

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
        | "parquetCacheStatus"
        | "parquetCacheBuildId"
        | "parquetCacheBuildStartedAt"
        | "parquetCacheFailureCode"
        | "parquetCacheFolderPath"
        | "parquetCachePartCount"
        | "parquetCacheSourceVersion"
        | "parquetCacheBuiltAt"
        | "parquetCacheRowCount"
        | "parquetCacheByteSize"
      >;
      Update: Partial<DataCatalogListingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
