import { where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { DataCatalogDriveClient } from "@/clients/data-catalog-listings/DataCatalogDriveClient";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnTypeVerifications } from "@/lib/openData/ColumnTypeVerifications";
import { isColumnTypeVerificationDue } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import {
  addCatalogFilterValue,
  EMPTY_CATALOG_FACETS,
  EMPTY_CATALOG_LISTING_FILTERS,
  resolveCatalogSortBy,
  settleCatalogListingFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogFilterRail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail";
import { useActiveCatalogFilters } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useActiveCatalogFilters/useActiveCatalogFilters";
import { useAddCatalogListing } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useAddCatalogListing/useAddCatalogListing";
import { useCatalogListingCompanions } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingCompanions/useCatalogListingCompanions";
import { useCatalogListingPreview } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingPreview/useCatalogListingPreview";
import { useDataCatalogFacets } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useDataCatalogSearch/useDataCatalogFacets";
import { useDataCatalogKeywordOptions } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useDataCatalogSearch/useDataCatalogKeywordOptions";
import { useDataCatalogSearch } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useDataCatalogSearch/useDataCatalogSearch";
import {
  useColumnTypeVerificationStatus,
  useVerifyColumnTypesOnDwell,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/useVerifyColumnTypesOnDwell/useVerifyColumnTypesOnDwell";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type {
  DataCatalogViewProps,
  DataCatalogViewState,
} from "./DataCatalogView.types";
import type {
  CatalogListingFilters,
  CatalogSortBy,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ColumnTypeState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";

/**
 * Whether the open listing's column types are known: `checking` while they
 * are unverified or stale and not known to have failed, `failed` when the
 * last verification on this page failed, otherwise `verified`.
 */
function _toColumnTypeState(
  listing: DataCatalogListing.T | undefined,
  status: ReturnType<typeof useColumnTypeVerificationStatus>,
): ColumnTypeState {
  if (status === "verifying") {
    return "checking";
  }
  if (listing === undefined || !isColumnTypeVerificationDue(listing)) {
    return "verified";
  }
  return status === "failed" ? "failed" : "checking";
}

/**
 * Browse the public open-data catalog, narrow it, inspect a dataset, and add
 * it to the current workspace. Postgres searches, filters, sorts, and counts
 * the catalog, and the results load a page at a time as the list scrolls.
 *
 * Three panes fill whatever height the host gives the catalog: filters,
 * results, and the selected dataset. They are regions of one surface split
 * by hairlines, each scrolling on its own, so a catalog of thousands never
 * pushes the add action or the filters off screen. Where the catalog is too
 * narrow for three panes the filters fold into a drawer, and narrower still
 * the dataset replaces the results instead of sitting beside them.
 */
export function useDataCatalogView({
  isAddAllowed,
  search,
  onSearchChange,
  onCatalogEmptyChange,
  onSaveSuccess,
  className,
  ...boxProps
}: Readonly<DataCatalogViewProps>): DataCatalogViewState {
  const workspace = useCurrentWorkspace();
  const [filters, setFilters] = useState<CatalogListingFilters>(
    EMPTY_CATALOG_LISTING_FILTERS,
  );
  const [chosenSortBy, setChosenSortBy] = useState<CatalogSortBy>();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<
    DataCatalogListing.Id | undefined
  >();
  // A listing opened from another's recommendations, with the search and
  // filters it was opened under. It is shown though the results may not
  // contain it, until the search or filters change.
  const [openedRecommendation, setOpenedRecommendation] = useState<
    | {
        catalogListingId: DataCatalogListing.Id;
        query: string;
        filters: CatalogListingFilters;
      }
    | undefined
  >();
  const [debouncedSearch] = useDebouncedValue(search.trim(), 150);
  const isSearching = debouncedSearch !== "";
  const sortBy = resolveCatalogSortBy({ chosenSortBy, isSearching });

  const catalogSearch = useDataCatalogSearch({
    query: debouncedSearch,
    filters,
    sortBy,
  });
  const { facets, isCountLoading } = useDataCatalogFacets({
    query: debouncedSearch,
    filters,
  });
  const isCatalogEmpty =
    facets !== undefined && facets.numCatalogListings === 0;
  useEffect(() => {
    onCatalogEmptyChange?.(isCatalogEmpty);
  }, [isCatalogEmpty, onCatalogEmptyChange]);
  const { keywordOptions, isKeywordCountLoading, onKeywordSearchChange } =
    useDataCatalogKeywordOptions({
      query: debouncedSearch,
      filters,
      topKeywords: facets?.tags ?? EMPTY_CATALOG_FACETS.tags,
    });
  const isLoadingCatalog = catalogSearch.isLoading;
  const changeFilters = (nextFilters: CatalogListingFilters): void => {
    setFilters(settleCatalogListingFilters(nextFilters));
  };
  const activeFilters = useActiveCatalogFilters({
    filters,
    onFiltersChange: changeFilters,
  });

  const [catalogListingColumns = [], isLoadingCatalogColumns] =
    DataCatalogRelationColumnClient.useGetAll({
      ...where("catalog_listing_id", "eq", selectedId),
      useQueryOptions: {
        enabled: selectedId !== undefined,
      },
    });

  // A selection the current results do not show is not shown, so the detail
  // never describes a dataset the list no longer contains. A listing opened
  // from a recommendation is the exception until the search or filters
  // change, since it was never picked from the list.
  const isOpenedRecommendationShown =
    openedRecommendation !== undefined &&
    openedRecommendation.catalogListingId === selectedId &&
    openedRecommendation.query === debouncedSearch &&
    openedRecommendation.filters === filters;
  const isSelectionShown =
    selectedId !== undefined &&
    (isOpenedRecommendationShown ||
      catalogSearch.listings.some((listing) => {
        return listing.id === selectedId;
      }));
  const [fetchedListing, isLoadingSelectedListing] =
    DataCatalogListingClient.useGetById({
      id: selectedId,
      useQueryOptions: {
        enabled: selectedId !== undefined,
      },
    });
  const selectedListing: DataCatalogListing.T | undefined = isSelectionShown
    ? fetchedListing
    : undefined;
  const [selectedListingDrive] = DataCatalogDriveClient.useGetById({
    id: selectedListing?.driveId,
    useQueryOptions: {
      enabled: selectedListing?.driveId !== undefined,
    },
  });

  useVerifyColumnTypesOnDwell({
    listing: selectedListing,
    coordinator: ColumnTypeVerifications,
  });
  const columnTypeVerificationStatus = useColumnTypeVerificationStatus({
    catalogListingId: selectedListing?.id,
    coordinator: ColumnTypeVerifications,
  });
  const selectedListingPreview = useCatalogListingPreview(selectedListing, {
    isRecheckingColumns: columnTypeVerificationStatus === "verifying",
  });
  const selectedListingCompanions = useCatalogListingCompanions({
    catalogListingId: selectedListing?.id,
    workspaceId: workspace.id,
  });
  const catalogListingAdder = useAddCatalogListing();
  const { addingListingIds, waitingToAddListingId } = catalogListingAdder;

  async function onAddToWorkspace(): Promise<void> {
    // An invalid or unsupported listing's button is only styled disabled,
    // so it still clicks.
    if (
      !selectedListing ||
      selectedListing.isInvalid ||
      !selectedListing.isWorkspaceLoadable
    ) {
      return;
    }
    const dataset = await catalogListingAdder.addListing(selectedListing);
    if (dataset !== undefined) {
      onSaveSuccess?.(dataset);
    }
  }

  const requestDatasetButton = (
    <Button
      variant="default"
      onClick={() => {
        openFeaturebaseFeedbackWidget({
          boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
        });
      }}
    >
      <Trans>Request a dataset</Trans>
    </Button>
  );

  const hasNoMatches = !isLoadingCatalog && catalogSearch.listings.length === 0;
  // One set of props for the pane and the full-screen modal, so the two
  // never describe the same listing differently.
  const detailProps = {
    listing: selectedListing,
    drive: selectedListingDrive,
    columns: catalogListingColumns,
    columnTypeState: _toColumnTypeState(
      selectedListing,
      columnTypeVerificationStatus,
    ),
    isAddAllowed,
    isAdding:
      selectedListing !== undefined && addingListingIds.has(selectedListing.id),
    isWaitingForColumnTypes:
      waitingToAddListingId !== undefined &&
      waitingToAddListingId === selectedListing?.id,
    isLoadingColumnMetadata: isLoadingCatalogColumns,
    preview: selectedListingPreview,
    onAddToWorkspace: () => {
      void onAddToWorkspace();
    },
    onBack: () => {
      setSelectedId(undefined);
    },
    onSelectTopic: (domain: string) => {
      setIsDetailExpanded(false);
      changeFilters(addCatalogFilterValue(filters, "domains", domain));
    },
    onAddKeyword: (tag: string) => {
      setIsDetailExpanded(false);
      changeFilters(addCatalogFilterValue(filters, "tags", tag));
    },
    companions: selectedListingCompanions,
    addingListingIds,
    onSelectListing: (catalogListingId: DataCatalogListing.Id) => {
      setSelectedId(catalogListingId);
      setOpenedRecommendation({
        catalogListingId,
        query: debouncedSearch,
        filters,
      });
    },
    onAddCompanion: catalogListingAdder.addCompanion,
  };
  const filterRail = (
    <DataCatalogFilterRail
      filters={filters}
      facets={facets ?? EMPTY_CATALOG_FACETS}
      keywordOptions={keywordOptions}
      isCountLoading={isCountLoading}
      isKeywordCountLoading={isKeywordCountLoading}
      onFiltersChange={changeFilters}
      onKeywordSearchChange={onKeywordSearchChange}
    />
  );
  return {
    requestDatasetButton,
    isCatalogEmpty,
    search,
    onSearchChange,
    className,
    boxProps,
    filters,
    setFilters,
    setChosenSortBy,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    isDetailExpanded,
    setIsDetailExpanded,
    selectedId,
    setSelectedId,
    isSearching,
    sortBy,
    catalogSearch,
    isLoadingCatalog,
    activeFilters,
    isSelectionShown,
    isLoadingSelectedListing,
    selectedListing,
    hasNoMatches,
    detailProps,
    filterRail,
  };
}
