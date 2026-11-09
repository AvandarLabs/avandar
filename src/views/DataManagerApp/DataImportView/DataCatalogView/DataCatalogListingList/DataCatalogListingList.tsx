import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { useId } from "@mantine/hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { buildOrganizationLine } from "@/views/DataManagerApp/DataImportView/DataCatalogView/buildOrganizationLine/buildOrganizationLine";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList.module.css";
import { formatCatalogListingDate } from "@/views/DataManagerApp/DataImportView/DataCatalogView/formatCatalogListingDate";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { KeyboardEvent, ReactNode } from "react";

/** A first guess at a row's height, corrected once the row is measured. */
const ESTIMATED_ROW_HEIGHT_PX = 60;

type Props = {
  /** Every result page loaded so far, in the order search sorted them. */
  displayedListings: readonly DataCatalogListing.SearchResult[];
  /**
   * How many listings the search and filters match, loaded or not, or
   * undefined when more match than were counted.
   */
  totalCount: number | undefined;
  /** Currently highlighted catalog listing id. */
  selectedId: string | undefined;
  /** Called when the user picks a row. */
  onSelect: (id: DataCatalogListing.Id) => void;
  /** Whether another page of results remains to load. */
  hasNextPage: boolean;
  /** Whether the next page is loading now. */
  isFetchingNextPage: boolean;
  /** Loads the next page of results. */
  fetchNextPage: () => unknown;
};

/** Where an arrow, Home, or End key moves the active row, if anywhere. */
function _getNextActiveIndex(options: {
  key: string;
  activeIndex: number;
  numRows: number;
}): number | undefined {
  const lastIndex = options.numRows - 1;
  switch (options.key) {
    case "ArrowDown":
      return Math.min(options.activeIndex + 1, lastIndex);
    case "ArrowUp":
      return Math.max(options.activeIndex - 1, 0);
    case "Home":
      return 0;
    case "End":
      return lastIndex;
    default:
      return undefined;
  }
}

/**
 * The catalog's results as one keyboard listbox. Only the rows in view are
 * rendered, and the next page loads as the last loaded row scrolls into view,
 * so a catalog of thousands scrolls as lightly as one of thirty.
 *
 * Arrow keys move the active row and Enter selects it, following the ARIA
 * listbox pattern: the list is one tab stop, not one per row. Each row reads
 * name first, then where the data comes from, its format, and when it last
 * changed, because for most listings those facts are all the catalog has.
 */
export function DataCatalogListingList({
  displayedListings,
  totalCount,
  selectedId,
  onSelect,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props): ReactNode {
  const { t } = useLingui();
  const optionIdPrefix = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const clampedActiveIndex = Math.min(
    activeIndex,
    Math.max(displayedListings.length - 1, 0),
  );
  const activeListing = displayedListings[clampedActiveIndex];

  const rowVirtualizer = useVirtualizer({
    count: displayedListings.length,
    getScrollElement: () => {
      return scrollerRef.current;
    },
    estimateSize: () => {
      return ESTIMATED_ROW_HEIGHT_PX;
    },
    overscan: 8,
  });
  const lastRenderedIndex = rowVirtualizer.getVirtualItems().at(-1)?.index;

  useEffect(() => {
    if (
      lastRenderedIndex !== undefined &&
      lastRenderedIndex >= displayedListings.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    lastRenderedIndex,
    displayedListings.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === "Enter" || event.key === " ") && activeListing) {
      event.preventDefault();
      onSelect(activeListing.id);
      return;
    }
    const nextActiveIndex = _getNextActiveIndex({
      key: event.key,
      activeIndex: clampedActiveIndex,
      numRows: displayedListings.length,
    });
    if (nextActiveIndex !== undefined) {
      event.preventDefault();
      setActiveIndex(nextActiveIndex);
      rowVirtualizer.scrollToIndex(nextActiveIndex);
    }
  };

  return (
    <div
      ref={scrollerRef}
      role="listbox"
      tabIndex={0}
      aria-label={t`Open datasets`}
      aria-activedescendant={
        activeListing ? `${optionIdPrefix}-${activeListing.id}` : undefined
      }
      className={css.dataCatalogListingList}
      onKeyDown={onKeyDown}
    >
      <div
        className={css.dataCatalogListingListSizer}
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const listing = displayedListings[virtualRow.index]!;
          const isSelected = listing.id === selectedId;
          const updatedDate =
            listing.lastUpdatedAt === undefined
              ? undefined
              : new Date(listing.lastUpdatedAt);
          return (
            <div
              key={listing.id}
              id={`${optionIdPrefix}-${listing.id}`}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              role="option"
              aria-selected={isSelected}
              // -1 tells assistive tech the list's size is unknown.
              aria-setsize={totalCount ?? -1}
              aria-posinset={virtualRow.index + 1}
              className={clsx(
                css.dataCatalogListingListRow,
                isSelected && css.dataCatalogListingListRowSelected,
                virtualRow.index === clampedActiveIndex &&
                  css.dataCatalogListingListRowActive,
              )}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              onClick={() => {
                setActiveIndex(virtualRow.index);
                onSelect(listing.id);
              }}
            >
              <Text size="sm" fw={isSelected ? 600 : 500} lineClamp={2}>
                {listing.displayName}
              </Text>
              <Text c="dimmed" lineClamp={1} size="xs">
                {[
                  buildOrganizationLine(listing),
                  listing.fileFormat,
                  updatedDate
                    ? t`Updated ${formatCatalogListingDate(updatedDate)}`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ")}
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
