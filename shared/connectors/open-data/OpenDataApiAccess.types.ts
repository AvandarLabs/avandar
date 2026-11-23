import type { OpenDataAccess } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";

/** How an open data source's bytes must be read. */
export type OpenDataContentKind = "parquet" | "csv";

/** The access shape `toAccess` produces for an `api_resource` entry. */
type OpenDataApiAccess = Extract<OpenDataAccess, { kind: "api_resource" }>;

/**
 * `OpenDataApiAccess` with `apiService` narrowed to one protocol. `Extract`
 * cannot do this narrowing itself: `apiService` is a plain field on a single
 * object type, not its own discriminated union member, so every `Extract`
 * candidate still has to satisfy the whole (wider) `apiService` type and
 * none do.
 */
export type OpenDataApiAccessFor<
  TService extends OpenDataApiAccess["apiService"],
> = Omit<OpenDataApiAccess, "apiService"> & { apiService: TService };
