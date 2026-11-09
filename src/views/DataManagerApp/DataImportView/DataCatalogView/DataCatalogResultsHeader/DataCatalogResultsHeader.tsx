import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Pill, Select, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader.module.css";
import type { CatalogSortBy } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ReactNode } from "react";

/** One removable reminder of something narrowing the results. */
export type ActiveCatalogFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type Props = {
  numResults: number;

  /**
   * Whether more datasets match than were counted, so `numResults` is a
   * floor rather than the count.
   */
  isNumResultsCapped: boolean;
  numCatalogListings: number;

  /**
   * Whether a search or a non-default filter is narrowing the results. Only
   * then is the catalog's total worth stating beside the count.
   */
  isNarrowed: boolean;
  activeFilters: readonly ActiveCatalogFilter[];
  onClearAll: () => void;
  sortBy: CatalogSortBy;
  isSearching: boolean;
  onSortByChange: (sortBy: CatalogSortBy) => void;

  /**
   * Opens the filters when the rail is folded away. The button is only
   * shown where the rail is not, which the stylesheet decides.
   */
  onOpenFilters: () => void;
};

/**
 * The line that says how much of the catalog is in view. The count is the
 * focal point: it shows how big the catalog is and what every filter just
 * did to it, so it is announced to screen readers as it changes.
 */
export function DataCatalogResultsHeader({
  numResults,
  isNumResultsCapped,
  numCatalogListings,
  isNarrowed,
  activeFilters,
  onClearAll,
  sortBy,
  isSearching,
  onSortByChange,
  onOpenFilters,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const numberFormat = new Intl.NumberFormat(i18n.locale);
  const formattedNumResults = numberFormat.format(numResults);
  const formattedNumCatalogListings = numberFormat.format(numCatalogListings);
  const sortOptions = [
    ...(isSearching ? [{ value: "relevance", label: t`Best match` }] : []),
    { value: "updated", label: t`Recently updated` },
    { value: "name", label: t`Name` },
  ];

  return (
    <div className={css.dataCatalogResultsHeader}>
      <Group justify="space-between" gap="xs">
        <Text
          component="h3"
          className={css.dataCatalogResultsHeaderCount}
          aria-live="polite"
        >
          {isNarrowed && isNumResultsCapped ? (
            <Trans>
              {formattedNumResults}+ of {formattedNumCatalogListings} datasets
            </Trans>
          ) : isNarrowed ? (
            <Trans>
              {formattedNumResults} of {formattedNumCatalogListings} datasets
            </Trans>
          ) : isNumResultsCapped ? (
            <Trans>{formattedNumResults}+ datasets</Trans>
          ) : (
            <Plural value={numResults} one="# dataset" other="# datasets" />
          )}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="default"
            size="xs"
            className={css.dataCatalogResultsHeaderFiltersButton}
            leftSection={<IconAdjustmentsHorizontal size={14} aria-hidden />}
            onClick={onOpenFilters}
          >
            {activeFilters.length > 0 ? (
              <Trans>Filters ({activeFilters.length})</Trans>
            ) : (
              <Trans>Filters</Trans>
            )}
          </Button>
          <Select
            size="xs"
            w={152}
            aria-label={t`Sort datasets by`}
            allowDeselect={false}
            data={sortOptions}
            value={sortBy}
            onChange={(value) => {
              if (value) {
                onSortByChange(value as CatalogSortBy);
              }
            }}
          />
        </Group>
      </Group>

      {activeFilters.length > 0 ? (
        <Group gap={6} className={css.dataCatalogResultsHeaderChips}>
          {activeFilters.map((activeFilter) => {
            return (
              <Pill
                key={activeFilter.key}
                withRemoveButton
                // Pill hides its remove button from assistive tech and the
                // tab order, since inside an input Backspace removes a pill.
                // Here the button is the only way to remove one.
                removeButtonProps={{
                  "aria-label": t`Remove filter: ${activeFilter.label}`,
                  "aria-hidden": false,
                  tabIndex: 0,
                }}
                onRemove={activeFilter.onRemove}
              >
                {activeFilter.label}
              </Pill>
            );
          })}
          <Button variant="subtle" size="compact-xs" onClick={onClearAll}>
            <Trans>Clear all</Trans>
          </Button>
        </Group>
      ) : null}
    </div>
  );
}
