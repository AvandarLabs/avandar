import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconWorldSearch } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { DataCatalogDriveClient } from "@/clients/data-catalog-listings/DataCatalogDriveClient";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { MODAL_ABOVE_NUX_TOUR_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnTypeVerifications } from "@/lib/openData/ColumnTypeVerifications";
import { isColumnTypeVerificationDue } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import {
  addCatalogFilterValue,
  EMPTY_CATALOG_FACETS,
  EMPTY_CATALOG_LISTING_FILTERS,
  hasActiveCatalogFilters,
  resolveCatalogSortBy,
  settleCatalogListingFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogFilterRail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail";
import { DataCatalogListingDetail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail";
import { DataCatalogListingList } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList";
import { DataCatalogResultsHeader } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogView.module.css";
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
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
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
  listing: DataCatalogListingRead | undefined,
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

type Props = BoxProps & {
  /** When false, the add action is disabled (subscription limits). */
  isAddAllowed: boolean;

  /** The catalog query typed in the tab-row search field. */
  search: string;

  /** Called with the search field's next value. */
  onSearchChange: (search: string) => void;

  /**
   * Tells the host when nothing is published, so it can hide the tab-row
   * search. False while the catalog is loading or has listings.
   */
  onCatalogEmptyChange?: (isCatalogEmpty: boolean) => void;

  /**
   * When set, this callback is invoked with the newly saved dataset after
   * a successful catalog-listing import.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

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
export function DataCatalogView({
  isAddAllowed,
  search,
  onSearchChange,
  onCatalogEmptyChange,
  onSaveSuccess,
  className,
  ...boxProps
}: Props): JSX.Element {
  const { t } = useLingui();
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
  const facets = useDataCatalogFacets({ query: debouncedSearch, filters });
  const isCatalogEmpty =
    facets !== undefined && facets.numCatalogListings === 0;
  useEffect(() => {
    onCatalogEmptyChange?.(isCatalogEmpty);
  }, [isCatalogEmpty, onCatalogEmptyChange]);
  const { keywordOptions, onKeywordSearchChange } =
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
  const selectedListing: DataCatalogListingRead | undefined = isSelectionShown
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

  // Nothing published yet. The tab-row search and the browser panes are all
  // affordances for choosing among things, so with nothing to choose they are
  // dead chrome: a box that can only ever answer "no results" and a pane that
  // asks the user to pick from an empty list. The activation state replaces
  // the panes. `onCatalogEmptyChange` tells the host to drop the search.
  // Same rule the no-datasets route follows.
  if (isCatalogEmpty) {
    return (
      <Box {...boxProps}>
        <AppSlateEmptyState
          icon={<IconWorldSearch size={32} stroke={1.5} aria-hidden />}
          title={t`Nothing in the catalog yet`}
          message={
            <Trans>
              Avandar prepares public datasets and publishes them here. The
              catalog grows from what people ask for, so tell us which one you
              need.
            </Trans>
          }
          action={requestDatasetButton}
        />
      </Box>
    );
  }

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
      onFiltersChange={changeFilters}
      onKeywordSearchChange={onKeywordSearchChange}
    />
  );

  return (
    <Box {...boxProps} className={clsx(css.dataCatalogView, className)}>
      <div
        className={clsx(
          css.dataCatalogViewBrowser,
          isSelectionShown && css.dataCatalogViewBrowserIsDetailOpen,
          hasNoMatches && css.dataCatalogViewBrowserHasNoMatches,
        )}
      >
        <aside className={css.dataCatalogViewRail} aria-label={t`Filters`}>
          {filterRail}
        </aside>

        <section className={css.dataCatalogViewResults} aria-label={t`Results`}>
          <DataCatalogResultsHeader
            numResults={catalogSearch.totalCount}
            isNumResultsCapped={catalogSearch.isTotalCapped}
            numCatalogListings={facets?.numCatalogListings ?? 0}
            // "X of Y" waits for the catalog's size, which the facet counts
            // carry, rather than reading "X of 0" for a moment.
            isNarrowed={
              (isSearching || hasActiveCatalogFilters(filters)) &&
              facets !== undefined
            }
            activeFilters={activeFilters}
            onClearAll={() => {
              setFilters(EMPTY_CATALOG_LISTING_FILTERS);
            }}
            sortBy={sortBy}
            isSearching={isSearching}
            onSortByChange={setChosenSortBy}
            onOpenFilters={() => {
              setIsFilterDrawerOpen(true);
            }}
          />
          {isLoadingCatalog ? (
            <Stack gap="md" p="md" aria-busy>
              {Array.from({ length: 8 }, (_, index) => {
                return (
                  <Stack key={index} gap={6}>
                    <Skeleton h={12} w="70%" />
                    <Skeleton h={10} w="45%" />
                  </Stack>
                );
              })}
            </Stack>
          ) : hasNoMatches ? (
            /*
             * One message spanning results and detail rather than a "no
             * matches" note beside a "pick one" note: the second cannot be
             * acted on, and two apologies for one situation read as two
             * situations.
             */
            <div className={css.dataCatalogViewNoMatches}>
              <Text size="sm" c="dimmed" ta="center" maw="42ch">
                <Trans>
                  No datasets match your search and filters. Try fewer filters
                  or different words.
                </Trans>
              </Text>
              <Group gap="xs" justify="center">
                {hasActiveCatalogFilters(filters) ? (
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => {
                      setFilters(EMPTY_CATALOG_LISTING_FILTERS);
                    }}
                  >
                    <Trans>Clear filters</Trans>
                  </Button>
                ) : null}
                {search ? (
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => {
                      onSearchChange("");
                    }}
                  >
                    <Trans>Clear search</Trans>
                  </Button>
                ) : null}
              </Group>
            </div>
          ) : (
            <DataCatalogListingList
              displayedListings={catalogSearch.listings}
              totalCount={
                catalogSearch.isTotalCapped
                  ? undefined
                  : catalogSearch.totalCount
              }
              selectedId={isSelectionShown ? selectedId : undefined}
              onSelect={setSelectedId}
              hasNextPage={catalogSearch.hasNextPage}
              isFetchingNextPage={catalogSearch.isFetchingNextPage}
              fetchNextPage={catalogSearch.fetchNextPage}
            />
          )}
        </section>

        {hasNoMatches ? null : (
          <section
            className={css.dataCatalogViewDetail}
            aria-label={t`Dataset details`}
          >
            {isSelectionShown && isLoadingSelectedListing ? (
              <Group justify="center" py="xl">
                <Loader size="sm" aria-label={t`Loading dataset`} />
              </Group>
            ) : (
              <DataCatalogListingDetail
                {...detailProps}
                onExpand={() => {
                  setIsDetailExpanded(true);
                }}
              />
            )}
          </section>
        )}
      </div>

      <Modal
        opened={isDetailExpanded && selectedListing !== undefined}
        onClose={() => {
          setIsDetailExpanded(false);
        }}
        title={selectedListing?.displayName}
        size="calc(100vw - 4rem)"
        yOffset="2rem"
        // Above the Data Explorer's Open dataset modal, which hosts this
        // view too.
        zIndex={MODAL_ABOVE_NUX_TOUR_Z_INDEX}
        classNames={{
          content: css.dataCatalogViewExpandedContent,
          title: css.dataCatalogViewExpandedTitle,
          body: css.dataCatalogViewExpandedBody,
        }}
      >
        <DataCatalogListingDetail {...detailProps} isExpanded />
      </Modal>

      <Drawer
        opened={isFilterDrawerOpen}
        onClose={() => {
          setIsFilterDrawerOpen(false);
        }}
        title={t`Filters`}
        size="xs"
        // Above the Data Explorer's Open dataset modal, which hosts this
        // view too.
        zIndex={MODAL_ABOVE_NUX_TOUR_Z_INDEX}
        classNames={{
          content: css.dataCatalogViewDrawerContent,
          body: css.dataCatalogViewDrawerBody,
        }}
      >
        {filterRail}
      </Drawer>
    </Box>
  );
}
