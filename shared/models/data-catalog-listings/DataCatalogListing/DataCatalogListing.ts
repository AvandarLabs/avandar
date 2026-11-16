/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  OpenDataAccess,
  OpenDataAccessKind,
  OpenDataApiService,
  InvalidDatasetReason as InvalidDatasetReasonType,
  ParquetCacheStatus as ParquetCacheStatusType,
  DataCatalogListingId,
  DataCatalogListingModel,
  DataCatalogListingSearchResult,
  DataCatalogListingUpdatedWithin,
  DataCatalogListingSortBy,
  DataCatalogListingSearchFilters,
  DataCatalogListingFacetOption,
  DataCatalogListingSearchFacets,
  DataCatalogListingCompanion,
  DataCatalogListingCompanionJoinPair,
  DataCatalogListingCompanionKind,
  DataCatalogListingResolvedCompanion,
  DataCatalogListingFreshnessProbe,
} from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";

export { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
export { DataCatalogListingModule as DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingModule.ts";

export namespace DataCatalogListing {
  export type T<K extends keyof DataCatalogListingModel = "Read"> =
    DataCatalogListingModel[K];
  export type Id = DataCatalogListingId;

  /** The access shape `toAccess` produces, with its undefined checks done. */
  export type Access = OpenDataAccess;

  /** Which of the two access shapes an entry uses. */
  export type AccessKind = OpenDataAccessKind;

  /** The API protocol an `api_resource` entry speaks. */
  export type ApiService = OpenDataApiService;

  /** Why an entry's dataset cannot be loaded. */
  export type InvalidDatasetReason = InvalidDatasetReasonType;

  /** Where an `api_resource` listing's Parquet copy stands. */
  export type ParquetCacheStatus = ParquetCacheStatusType;

  /** One listing as catalog search returns it, with only the list's columns. */
  export type SearchResult = DataCatalogListingSearchResult;

  /** How recently a listing must have changed to pass the update filter. */
  export type UpdatedWithin = DataCatalogListingUpdatedWithin;

  /** The order catalog search lists its results in. */
  export type SortBy = DataCatalogListingSortBy;

  /** The narrowing applied to a catalog search. */
  export type SearchFilters = DataCatalogListingSearchFilters;

  /** One choosable value of a facet and how many listings it would keep. */
  export type FacetOption = DataCatalogListingFacetOption;

  /** What each search filter would keep. */
  export type SearchFacets = DataCatalogListingSearchFacets;

  /** One listing recommended alongside another, as the listing names it. */
  export type Companion = DataCatalogListingCompanion;

  /** One pair of columns that joins a listing to a companion. */
  export type CompanionJoinPair = DataCatalogListingCompanionJoinPair;

  /** Why a listing is recommended alongside another. */
  export type CompanionKind = DataCatalogListingCompanionKind;

  /** A companion matched to its listing, with whether it can be added. */
  export type ResolvedCompanion = DataCatalogListingResolvedCompanion;

  /** How to read a listing's freshness token from its source. */
  export type FreshnessProbe = DataCatalogListingFreshnessProbe;
}
