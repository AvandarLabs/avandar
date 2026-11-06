import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Button,
  Drawer,
  Group,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconWorldSearch } from "@tabler/icons-react";
import clsx from "clsx";
import { useState } from "react";
import { uuid } from "$/lib/uuid";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { MODAL_ABOVE_NUX_TOUR_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnTypeVerifications } from "@/lib/openData/ColumnTypeVerifications";
import { isColumnTypeVerificationDue } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { resolveOpenDataDatasetColumnInputs } from "@/views/DataManagerApp/DataImportView/DataCatalogView/buildOpenDataDatasetColumnInputs";
import { EMPTY_CATALOG_LISTING_FILTERS } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogFilterRail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail";
import { DataCatalogListingDetail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail";
import { DataCatalogListingList } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList";
import { DataCatalogResultsHeader } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogView.module.css";
import { readCatalogColumnsForAdding } from "@/views/DataManagerApp/DataImportView/DataCatalogView/readCatalogColumnsForAdding/readCatalogColumnsForAdding";
import {
  useColumnTypeVerificationStatus,
  useVerifyColumnTypesOnDwell,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/useVerifyColumnTypesOnDwell/useVerifyColumnTypesOnDwell";
import { useDisplayedCatalogListings } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useDisplayedCatalogListings";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CatalogListingFilters,
  CatalogSortBy,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ColumnTypeState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";
import type { ActiveCatalogFilter } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";

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

/**
 * One removable chip per thing narrowing the results beyond the default, so
 * a user can always see why a dataset they expected is missing.
 */
function _buildActiveFilters(options: {
  filters: Readonly<CatalogListingFilters>;
  onFiltersChange: (filters: CatalogListingFilters) => void;
  labels: { updatedWithin: string; showingUnloadable: string };
}): ActiveCatalogFilter[] {
  const { filters, onFiltersChange, labels } = options;
  const removeValue = (key: "sources" | "formats", value: string) => {
    return () => {
      onFiltersChange({
        ...filters,
        [key]: filters[key].filter((chosenValue) => {
          return chosenValue !== value;
        }),
      });
    };
  };
  return [
    ...filters.sources.map((source) => {
      return {
        key: `source:${source}`,
        label: source,
        onRemove: removeValue("sources", source),
      };
    }),
    ...filters.formats.map((format) => {
      return {
        key: `format:${format}`,
        label: format,
        onRemove: removeValue("formats", format),
      };
    }),
    ...(filters.updatedWithin === "any"
      ? []
      : [
          {
            key: "updatedWithin",
            label: labels.updatedWithin,
            onRemove: () => {
              onFiltersChange({ ...filters, updatedWithin: "any" });
            },
          },
        ]),
    ...(filters.isLoadableOnly
      ? []
      : [
          {
            key: "isLoadableOnly",
            label: labels.showingUnloadable,
            onRemove: () => {
              onFiltersChange({ ...filters, isLoadableOnly: true });
            },
          },
        ]),
  ];
}

type Props = BoxProps & {
  /** When false, the add action is disabled (subscription limits). */
  isAddAllowed: boolean;

  /**
   * When set, this callback is invoked with the newly saved dataset after
   * a successful catalog-listing import.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

/**
 * Browse the public open-data catalog, narrow it, inspect a dataset, and add
 * it to the current workspace.
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
  onSaveSuccess,
  className,
  ...boxProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CatalogListingFilters>(
    EMPTY_CATALOG_LISTING_FILTERS,
  );
  const [chosenSortBy, setChosenSortBy] = useState<CatalogSortBy>();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const [catalogListings = [], isLoadingCatalog] =
    DataCatalogListingClient.useGetAll({});

  const [catalogListingColumns = [], isLoadingCatalogColumns] =
    DataCatalogRelationColumnClient.useGetAll({
      ...where("catalog_listing_id", "eq", selectedId),
      useQueryOptions: {
        enabled: selectedId !== undefined,
      },
    });

  const { displayedListings, facets, sortBy, isSearching } =
    useDisplayedCatalogListings({
      listings: catalogListings,
      search,
      filters,
      chosenSortBy,
    });

  // A selection the current filters hide is not shown, so the detail never
  // describes a dataset the results no longer contain.
  const selectedListing: DataCatalogListingRead | undefined =
    selectedId === undefined
      ? undefined
      : displayedListings.find((listing) => {
          return listing.id === selectedId;
        });

  useVerifyColumnTypesOnDwell({
    listing: selectedListing,
    coordinator: ColumnTypeVerifications,
  });
  const columnTypeVerificationStatus = useColumnTypeVerificationStatus({
    catalogListingId: selectedListing?.id,
    coordinator: ColumnTypeVerifications,
  });
  // The listing whose "Add to workspace" is waiting for its column types to
  // be verified before it saves.
  const [waitingToAddListingId, setWaitingToAddListingId] = useState<
    DataCatalogListing.Id | undefined
  >();

  const [insertOpenDataDataset, isInsertPending] =
    DatasetClient.useInsertOpenDataDataset({
      onSuccess: (dataset) => {
        notifySuccess({
          title: t`Dataset added`,
          message: t`"${dataset.name}" is now in your workspace.`,
        });
        onSaveSuccess?.(dataset);
      },
      queriesToInvalidate: [DatasetClient.QueryKeys.getAll()],
    });

  async function _readColumnsForAdding(
    listing: DataCatalogListingRead,
  ): Promise<readonly DataCatalogRelationColumn.T[] | undefined> {
    setWaitingToAddListingId(listing.id);
    try {
      return await readCatalogColumnsForAdding({
        listing,
        coordinator: ColumnTypeVerifications,
        readColumns: (catalogListingId) => {
          return DataCatalogRelationColumnClient.getAll(
            where("catalog_listing_id", "eq", catalogListingId),
          );
        },
      });
    } catch (error) {
      Logger.warn("Could not verify a catalog listing's columns to add it", {
        catalogListingId: listing.id,
        error,
      });
      notifyError({
        title: t`Cannot add dataset yet`,
        message: t`We couldn't check this dataset's columns. Try adding it again.`,
      });
      return undefined;
    } finally {
      setWaitingToAddListingId(undefined);
    }
  }

  async function onAddToWorkspace(): Promise<void> {
    // An invalid listing's button is only styled disabled, so it still
    // clicks.
    if (!selectedListing || selectedListing.isInvalid) {
      return;
    }
    const listing = selectedListing;
    const columns = await _readColumnsForAdding(listing);
    if (columns === undefined) {
      return;
    }
    const columnInputs = resolveOpenDataDatasetColumnInputs({
      catalogColumns: [...columns],
      metadata: listing.metadata,
    });
    if (!columnInputs) {
      notifyError({
        title: t`Cannot add dataset`,
        message: t`This catalog listing has no column metadata. It cannot be imported yet.`,
      });
      return;
    }
    insertOpenDataDataset({
      catalogListingId: listing.id,
      columns: columnInputs,
      datasetDescription: listing.description ?? "",
      datasetId: uuid(),
      datasetName: listing.displayName,
      workspaceId: workspace.id,
    });
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

  // Nothing published yet. The search field and the browser panes are all
  // affordances for choosing among things, so with nothing to choose they are
  // dead chrome: a box that can only ever answer "no results" and a pane that
  // asks the user to pick from an empty list. The activation state replaces
  // all of it and carries the one move that does something, which is telling
  // us what to publish next. Same rule the no-datasets route follows.
  if (!isLoadingCatalog && catalogListings.length === 0) {
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

  const updatedWithinLabels = {
    any: "",
    pastMonth: t`Updated in the past month`,
    pastYear: t`Updated in the past year`,
    overAYear: t`Updated over a year ago`,
  };
  const activeFilters = _buildActiveFilters({
    filters,
    onFiltersChange: setFilters,
    labels: {
      updatedWithin: updatedWithinLabels[filters.updatedWithin],
      showingUnloadable: t`Including datasets that can't be loaded`,
    },
  });
  const hasNoMatches = !isLoadingCatalog && displayedListings.length === 0;
  const filterRail = (
    <DataCatalogFilterRail
      search={search}
      onSearchChange={setSearch}
      filters={filters}
      facets={facets}
      onFiltersChange={setFilters}
    />
  );

  return (
    <Box {...boxProps} className={clsx(css.dataCatalogView, className)}>
      <div
        className={clsx(
          css.dataCatalogViewBrowser,
          selectedListing && css.dataCatalogViewBrowserIsDetailOpen,
          hasNoMatches && css.dataCatalogViewBrowserHasNoMatches,
        )}
      >
        <aside className={css.dataCatalogViewRail} aria-label={t`Filters`}>
          {filterRail}
        </aside>

        <section className={css.dataCatalogViewResults} aria-label={t`Results`}>
          <DataCatalogResultsHeader
            numResults={displayedListings.length}
            numCatalogListings={catalogListings.length}
            isNarrowed={isSearching || activeFilters.length > 0}
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
                {activeFilters.length > 0 ? (
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
                      setSearch("");
                    }}
                  >
                    <Trans>Clear search</Trans>
                  </Button>
                ) : null}
              </Group>
            </div>
          ) : (
            <DataCatalogListingList
              displayedListings={displayedListings}
              selectedId={selectedListing?.id}
              onSelect={setSelectedId}
            />
          )}
        </section>

        {hasNoMatches ? null : (
          <section
            className={css.dataCatalogViewDetail}
            aria-label={t`Dataset details`}
          >
            <DataCatalogListingDetail
              listing={selectedListing}
              columns={catalogListingColumns}
              columnTypeState={_toColumnTypeState(
                selectedListing,
                columnTypeVerificationStatus,
              )}
              isAddAllowed={isAddAllowed}
              isAdding={isInsertPending}
              isWaitingForColumnTypes={
                waitingToAddListingId !== undefined &&
                waitingToAddListingId === selectedListing?.id
              }
              isLoadingColumnMetadata={isLoadingCatalogColumns}
              onAddToWorkspace={() => {
                void onAddToWorkspace();
              }}
              onBack={() => {
                setSelectedId(undefined);
              }}
            />
          </section>
        )}
      </div>

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
