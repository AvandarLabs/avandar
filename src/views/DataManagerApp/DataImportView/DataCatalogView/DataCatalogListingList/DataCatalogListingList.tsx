import { constant } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Text, UnstyledButton } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList.module.css";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { ReactNode } from "react";

/**
 * A guess at a row's height before it renders. Rows are measured once they
 * render, since a two-line name or a status line makes one taller.
 */
const ESTIMATED_ROW_HEIGHT_PX = 52;

/** Space between rows, matching the list's former two-pixel stack gap. */
const ROW_GAP_PX = 2;

type Props = {
  /** Every search result loaded so far, in ranked order. */
  listings: readonly DataCatalogListing.SearchResult[];
  /** How many listings match the search, loaded or not. */
  totalCount: number;
  /** Currently highlighted catalog listing id. */
  selectedId: DataCatalogListing.Id | undefined;
  /** Called when the user picks a row. */
  onSelect: (id: DataCatalogListing.Id) => void;
  /** Whether more matches exist past the loaded ones. */
  hasNextPage: boolean;
  /** Whether the next page is loading now. */
  isFetchingNextPage: boolean;
  /** Loads the next page of matches. */
  fetchNextPage: () => unknown;
};

/**
 * The catalog as a scrolling list of rows that loads more matches as the
 * user nears the end. Only the rows in view are rendered, so a catalog of
 * thousands of listings costs the DOM a screenful.
 *
 * Selection is a fill and a weight change, which is both quieter and easier
 * to spot than a border that appears on one of thirty identical boxes. The
 * rows are plain, not bordered, shadowed cards. A listing whose dataset
 * cannot be loaded says so under its name.
 *
 * Only rendered when there is something to list. Which of the two empty
 * situations applies, an unpublished catalog or a query that matched nothing,
 * is the parent's to tell apart, and each wants a different answer.
 */
export function DataCatalogListingList({
  listings,
  totalCount,
  selectedId,
  onSelect,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props): ReactNode {
  const { t } = useLingui();
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: listings.length,
    getScrollElement: () => {
      return scrollElementRef.current;
    },
    estimateSize: constant(ESTIMATED_ROW_HEIGHT_PX),
    gap: ROW_GAP_PX,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const lastRenderedIndex = virtualRows.at(-1)?.index ?? -1;

  useEffect(() => {
    if (
      lastRenderedIndex >= listings.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    lastRenderedIndex,
    listings.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  return (
    <div ref={scrollElementRef} className={css.dataCatalogListingListScroller}>
      <div
        role="listbox"
        aria-label={t`Catalog datasets`}
        aria-orientation="vertical"
        className={css.dataCatalogListingListTrack}
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {virtualRows.map((virtualRow) => {
          const listing = listings[virtualRow.index];
          if (!listing) {
            return null;
          }
          return (
            <div
              key={listing.id}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className={css.dataCatalogListingListSlot}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <DataCatalogListingListRow
                listing={listing}
                position={virtualRow.index + 1}
                setSize={totalCount}
                isSelected={listing.id === selectedId}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
      {isFetchingNextPage ? (
        <div className={css.dataCatalogListingListMoreLoader}>
          <Loader size="xs" aria-label={t`Loading more datasets`} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One listing in the list. Carries its position in the whole result set,
 * since only the rows in view exist for assistive technology to count.
 */
function DataCatalogListingListRow({
  listing,
  position,
  setSize,
  isSelected,
  onSelect,
}: {
  listing: DataCatalogListing.SearchResult;
  position: number;
  setSize: number;
  isSelected: boolean;
  onSelect: (id: DataCatalogListing.Id) => void;
}): ReactNode {
  return (
    <UnstyledButton
      role="option"
      aria-selected={isSelected}
      aria-posinset={position}
      aria-setsize={setSize}
      className={clsx(
        css.dataCatalogListingListRow,
        isSelected && css.dataCatalogListingListRowSelected,
      )}
      onClick={() => {
        onSelect(listing.id);
      }}
    >
      <Text size="sm" fw={isSelected ? 600 : 500} lineClamp={2}>
        {listing.displayName}
      </Text>
      <Text c="dimmed" lineClamp={1} size="xs">
        {listing.organization1Name}
      </Text>
      {!listing.isWorkspaceLoadable ? (
        <Text c="dimmed" size="xs">
          <Trans>Not supported yet</Trans>
        </Text>
      ) : listing.isInvalid ? (
        <Text c="danger.8" size="xs">
          <Trans>Can't be loaded</Trans>
        </Text>
      ) : null}
    </UnstyledButton>
  );
}
