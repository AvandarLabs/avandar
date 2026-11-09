import type { EtlPipelineWorkspaceLoadability } from "@etl/EtlConfig/EtlConfig.types";
import type { EtlOrganizationLabels } from "@etl/EtlEngine/EtlEngine.types";

/**
 * The listing fields a pipeline config can map, as the listings table names
 * them. Everything else a listing carries (its ids, format, columns, display
 * name, the timestamp a crawl resumes from, its URLs, and its loadability)
 * stays computed in code, because a pipeline's correctness depends on it.
 */
export const CATALOG_MAPPABLE_FIELDS = [
  "description",
  "notes",
  "license",
  "update_frequency",
  "canonical_urls",
  "coverage_start_date",
  "coverage_end_date",
  "organization1_name",
  "organization2_name",
  "organization3_name",
  "organization4_name",
  "domains",
  "tags",
] as const;

/** One listing field a pipeline config can map. */
export type CatalogMappableField = (typeof CATALOG_MAPPABLE_FIELDS)[number];

/** The one field every drive must map. */
export const REQUIRED_CATALOG_FIELD = "organization1_name";

/**
 * A dotted path into a source record: segments of letters, digits, `_`, and
 * `-`, such as `classification.domain_tags` or `groups.0.title`.
 */
export const CATALOG_FIELD_PATH_PATTERN = /^[\w-]+(\.[\w-]+)*$/;

/**
 * Where one field's value comes from: a dotted path into the source record,
 * a constant, or the default export of a script whose path is relative to
 * the config file.
 */
export type CatalogFieldSource =
  | Readonly<{ from: string }>
  | Readonly<{ value: string | readonly string[] }>
  | Readonly<{ script: string }>;

/** A set of field mappings, keyed by the field each one fills. */
export type CatalogFieldMappings = Readonly<
  Partial<Record<CatalogMappableField, CatalogFieldSource>>
>;

/** One drive in a pipeline config. */
export type PipelineDriveConfig = Readonly<{
  /** `https://`, with no trailing slash. Also the drive's key. */
  baseUrl: string;
  /**
   * Replaces the pipeline's labels for this drive. A level this omits has
   * no label, even when the pipeline's labels name it.
   */
  organizationLabels?: EtlOrganizationLabels;
  /** Merged over the pipeline's `fields`, key by key. */
  fields?: CatalogFieldMappings;
  /** Left unparsed here: each pipeline validates its own scopes. */
  scopes?: unknown;
}>;

/**
 * How the pipeline server downloads one of this pipeline's listings to copy
 * it into Parquet. `script` is relative to the config file and
 * default-exports a `ListingDownloadScript`.
 *
 * `paging` says whether the pipeline's API serves a listing in pages. A paged
 * listing is downloaded and converted one page of `pageRows` rows at a time,
 * so a copy never needs the whole source on disk. A listing whose API does
 * not page is downloaded as one file.
 */
export type PipelineDownloadConfig =
  | Readonly<{ paging: true; pageRows: number; script: string }>
  | Readonly<{ paging: false; script: string }>;

/**
 * What a listing's `additional_source_metadata` leaves out besides the paths
 * its field mappings consume.
 */
export type PipelineAdditionalSourceMetadataConfig = Readonly<{
  /**
   * Source record paths no listing column holds that are still not worth
   * keeping, such as a license's full text when its name is mapped.
   */
  omit?: readonly string[];
}>;

/**
 * One pipeline's config file, such as `socrata.pipeline.yaml`: its drives,
 * how each source record becomes catalog metadata, and its changes to the
 * shared workspace loadability rules.
 */
export type PipelineConfig = Readonly<{
  /** The labels every drive uses unless it sets its own. */
  organizationLabels?: EtlOrganizationLabels;
  /** The mappings every drive uses. */
  fields?: CatalogFieldMappings;
  /** The drives to crawl, in order. Empty switches the pipeline off. */
  drives: readonly PipelineDriveConfig[];
  /** This pipeline's changes to `etl.config.yaml`'s global rules. */
  workspaceLoadability?: EtlPipelineWorkspaceLoadability;
  /**
   * How a listing is downloaded for its Parquet copy. Omit it when the
   * pipeline's listings are never copied.
   */
  download?: PipelineDownloadConfig;
  /** What `additional_source_metadata` leaves out. */
  additionalSourceMetadata?: PipelineAdditionalSourceMetadataConfig;
}>;
