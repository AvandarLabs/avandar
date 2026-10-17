import { Stack, Text, UnstyledButton } from "@mantine/core";
import clsx from "clsx";
import css from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogListingList/OpenDataCatalogListingList.module.css";
import type { OpenDataCatalogListingRead } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.types";
import type { ReactNode } from "react";

type Props = {
  /** Listings after optional fuzzy search. */
  displayedListings: readonly OpenDataCatalogListingRead[];
  /** Currently highlighted catalog listing id. */
  selectedId: string | undefined;
  /** Called when the user picks a row. */
  onSelect: (id: string) => void;
};

/**
 * The catalog as a list of rows.
 *
 * Selection is a fill and a weight change, which is both quieter and easier
 * to spot than a border that appears on one of thirty identical boxes. The
 * rows are plain, not bordered, shadowed cards.
 *
 * Only rendered when there is something to list. Which of the two empty
 * situations applies, an unpublished catalog or a query that matched nothing,
 * is the parent's to tell apart, and each wants a different answer.
 */
export function OpenDataCatalogListingList({
  displayedListings,
  selectedId,
  onSelect,
}: Props): ReactNode {
  return (
    <Stack gap={2} role="listbox" aria-orientation="vertical">
      {displayedListings.map((listing) => {
        const isSelected = listing.id === selectedId;
        return (
          <UnstyledButton
            key={listing.id}
            role="option"
            aria-selected={isSelected}
            className={clsx(
              css.openDataCatalogListingListRow,
              isSelected && css.openDataCatalogListingListRowSelected,
            )}
            onClick={() => {
              onSelect(listing.id);
            }}
          >
            <Text size="sm" fw={isSelected ? 600 : 500} lineClamp={2}>
              {listing.displayName}
            </Text>
            <Text c="dimmed" lineClamp={1} size="xs">
              {listing.externalOrganizationName}
              {listing.pipelineName ? ` · ${listing.pipelineName}` : ""}
            </Text>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
