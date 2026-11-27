import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconWorldSearch } from "@tabler/icons-react";
import { clsx } from "clsx";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { MODAL_ABOVE_NUX_TOUR_Z_INDEX } from "@/config/Theme";
import {
  EMPTY_CATALOG_LISTING_FILTERS,
  hasActiveCatalogFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogListingDetail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail";
import { DataCatalogListingList } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList";
import { DataCatalogResultsHeader } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogView.module.css";
import { useDataCatalogView } from "./useDataCatalogView";
import type { DataCatalogViewProps } from "./DataCatalogView.types";

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
export function DataCatalogView(
  props: Readonly<DataCatalogViewProps>,
): JSX.Element {
  const {
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
  } = useDataCatalogView(props);
  const { t } = useLingui();
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
            // One message spanning results and detail rather than a "no
            // matches" note beside a "pick one" note: the second cannot be
            // acted on, and two apologies for one situation read as two
            // situations.
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
