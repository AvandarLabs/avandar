import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import {
  fetchCatalogListingPreview,
  isCatalogListingSampleFormat,
} from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type {
  CatalogListingPreview,
  CatalogListingPreviewSource,
} from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";
import type { UseQueryResult } from "@tanstack/react-query";

/** What the open listing's data preview shows. */
export type CatalogListingPreviewState = {
  preview: CatalogListingPreview | undefined;
  isLoading: boolean;
  isError: boolean;
  /** False when the listing has no data a workspace could read. */
  isAvailable: boolean;
};

type PreviewListing = Pick<
  DataCatalogListing.T,
  | "id"
  | "accessKind"
  | "apiResourceFormat"
  | "canonicalUrls"
  | "parquetCacheFolderPath"
>;

/**
 * Reads the first rows of the open catalog listing, the same number a
 * workspace dataset's preview shows. A listing that is invalid, or that a
 * workspace cannot load, has no preview to read.
 *
 * A stored Parquet copy is shown as soon as it loads, and it is not read
 * again from the source API. While a column-type recheck is reading the
 * source, the copy stays up, and the recheck's rows replace it only if
 * they differ. The rows are kept for the page's life: a listing's data
 * changes on the pipeline's schedule, not while someone is browsing.
 *
 * @param listing The open listing, or undefined when none is open.
 * @param options.isRecheckingColumns True while this listing's column
 * types are being read from the source API.
 */
export function useCatalogListingPreview(
  listing: DataCatalogListing.T | undefined,
  options?: { isRecheckingColumns?: boolean },
): CatalogListingPreviewState {
  const isAvailable =
    listing !== undefined && listing.isWorkspaceLoadable && !listing.isInvalid;
  const isRecheckingColumns = options?.isRecheckingColumns ?? false;
  const recheckedListingId = useRecheckedListingId(
    listing?.id,
    isRecheckingColumns,
  );
  const readStoredCopy = _shouldReadStoredCopy(listing, isAvailable);
  const readLiveSample = _shouldReadLiveSample({
    listing,
    isAvailable,
    isRecheckingColumns,
    recheckedListingId,
  });
  // Only the fields the read uses. A column recheck updates the listing
  // without reading a copy that is already shown.
  const previewListing =
    listing === undefined ? undefined : _toPreviewListing(listing);
  const storedQuery = usePreviewQuery({
    listing: previewListing,
    source: "stored-copy",
    enabled: readStoredCopy,
  });
  const liveQuery = usePreviewQuery({
    listing: previewListing,
    source: "live-sample",
    enabled: readLiveSample,
  });
  return _toPreviewState({
    isAvailable,
    readStoredCopy,
    readLiveSample,
    storedQuery,
    liveQuery,
  });
}

/**
 * A stored copy, or a pipeline listing's own Parquet URL. A CSV or OData
 * listing with no copy yet has nothing stored to read.
 */
function _shouldReadStoredCopy(
  listing: DataCatalogListing.T | undefined,
  isAvailable: boolean,
): boolean {
  if (!isAvailable || listing === undefined) {
    return false;
  }
  if (listing.accessKind !== "api_resource") {
    return true;
  }
  return (
    listing.parquetCacheFolderPath !== undefined ||
    !isCatalogListingSampleFormat(listing.apiResourceFormat)
  );
}

/**
 * The source API. A CSV or OData listing with no copy has no other preview.
 * One that has a copy is read from the API only when a column recheck is
 * reading it, and that read stays put so its rows can replace the copy.
 */
function _shouldReadLiveSample(options: {
  listing: DataCatalogListing.T | undefined;
  isAvailable: boolean;
  isRecheckingColumns: boolean;
  recheckedListingId: DataCatalogListing.Id | undefined;
}): boolean {
  const { listing } = options;
  if (
    !options.isAvailable ||
    listing === undefined ||
    listing.accessKind !== "api_resource" ||
    !isCatalogListingSampleFormat(listing.apiResourceFormat)
  ) {
    return false;
  }
  if (listing.parquetCacheFolderPath === undefined) {
    return true;
  }
  return (
    options.isRecheckingColumns || options.recheckedListingId === listing.id
  );
}

/**
 * The listing whose column recheck has started on this page. Remembered so
 * the recheck's rows are still applied after the recheck itself finishes.
 */
function useRecheckedListingId(
  listingId: DataCatalogListing.Id | undefined,
  isRecheckingColumns: boolean,
): DataCatalogListing.Id | undefined {
  const [recheckedListingId, setRecheckedListingId] = useState<
    DataCatalogListing.Id | undefined
  >();
  if (
    isRecheckingColumns &&
    listingId !== undefined &&
    recheckedListingId !== listingId
  ) {
    setRecheckedListingId(listingId);
  }
  return recheckedListingId;
}

function usePreviewQuery(options: {
  listing: PreviewListing | undefined;
  source: CatalogListingPreviewSource;
  enabled: boolean;
}): UseQueryResult<CatalogListingPreview> {
  const { listing, source, enabled } = options;
  return useQuery({
    queryKey: ["data-catalog-listing-preview", source, listing],
    queryFn: () => {
      if (listing === undefined) {
        throw new Error("No catalog listing is open to preview");
      }
      return fetchCatalogListingPreview({
        listing,
        maxPreviewRows: GlobalAppConfig.dataManagerApp.maxPreviewRows,
        source,
      });
    },
    enabled,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function _toPreviewListing(listing: DataCatalogListing.T): PreviewListing {
  return {
    id: listing.id,
    accessKind: listing.accessKind,
    apiResourceFormat: listing.apiResourceFormat,
    canonicalUrls: listing.canonicalUrls,
    parquetCacheFolderPath: listing.parquetCacheFolderPath,
  };
}

function _toPreviewState(options: {
  isAvailable: boolean;
  readStoredCopy: boolean;
  readLiveSample: boolean;
  storedQuery: UseQueryResult<CatalogListingPreview>;
  liveQuery: UseQueryResult<CatalogListingPreview>;
}): CatalogListingPreviewState {
  const preview = _resolveShownPreview(
    options.storedQuery.data,
    options.liveQuery.data,
  );
  const isReading =
    (options.readStoredCopy && options.storedQuery.isPending) ||
    (options.readLiveSample && options.liveQuery.isPending);
  const didFail = options.storedQuery.isError || options.liveQuery.isError;
  return {
    preview,
    isLoading: options.isAvailable && preview === undefined && isReading,
    isError:
      options.isAvailable && preview === undefined && !isReading && didFail,
    isAvailable: options.isAvailable,
  };
}

/**
 * The copy, until a column recheck has rows that are not the copy's rows.
 * Matching rows keep the copy, so the grid does not reload the same data.
 */
function _resolveShownPreview(
  storedCopy: CatalogListingPreview | undefined,
  liveSample: CatalogListingPreview | undefined,
): CatalogListingPreview | undefined {
  if (storedCopy === undefined) {
    return liveSample;
  }
  if (liveSample === undefined || _samePreview(storedCopy, liveSample)) {
    return storedCopy;
  }
  return liveSample;
}

function _samePreview(
  storedCopy: CatalogListingPreview,
  liveSample: CatalogListingPreview,
): boolean {
  return (
    _sameNames(storedCopy.columnNames, liveSample.columnNames) &&
    _sameNames(storedCopy.dateColumnNames, liveSample.dateColumnNames) &&
    storedCopy.rows.length === liveSample.rows.length &&
    storedCopy.rows.every((row, index) => {
      return _sameRow(row, liveSample.rows[index], storedCopy.columnNames);
    })
  );
}

function _sameNames(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((name, index) => {
      return name === right[index];
    })
  );
}

function _sameRow(
  left: CatalogListingPreview["rows"][number],
  right: CatalogListingPreview["rows"][number] | undefined,
  columnNames: readonly string[],
): boolean {
  if (right === undefined) {
    return false;
  }
  return columnNames.every((columnName) => {
    return left[columnName] === right[columnName];
  });
}
