import { useLingui } from "@lingui/react/macro";
import { removeCatalogFilterValue } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type {
  CatalogListingFilters,
  CatalogUpdatedWithin,
  CatalogValueFilterKey,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ActiveCatalogFilter } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";

/** One chip per chosen value of a filter that holds a list of values. */
function _buildValueChips(options: {
  filters: Readonly<CatalogListingFilters>;
  onFiltersChange: (filters: CatalogListingFilters) => void;
  key: CatalogValueFilterKey;

  /** Labels a chip, which shows the raw value when not set. */
  toLabel?: (value: string) => string;
}): ActiveCatalogFilter[] {
  const { filters, onFiltersChange, key, toLabel } = options;
  return filters[key].map((value) => {
    return {
      key: `${key}:${value}`,
      label: toLabel ? toLabel(value) : value,
      onRemove: () => {
        onFiltersChange(removeCatalogFilterValue(filters, key, value));
      },
    };
  });
}

/**
 * A chip for the update window and the loadable switch, each only when it
 * differs from the catalog's default.
 */
function _buildSettingChips(options: {
  filters: Readonly<CatalogListingFilters>;
  onFiltersChange: (filters: CatalogListingFilters) => void;
  labels: { updatedWithin: string; showingUnloadable: string };
}): ActiveCatalogFilter[] {
  const { filters, onFiltersChange, labels } = options;
  return [
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

/**
 * One removable chip per thing narrowing the catalog's results beyond the
 * default, so a user can always see why a dataset they expected is missing.
 * `DataCatalogView` hands the chips to `DataCatalogResultsHeader`.
 */
export function useActiveCatalogFilters(options: {
  filters: Readonly<CatalogListingFilters>;
  onFiltersChange: (filters: CatalogListingFilters) => void;
}): ActiveCatalogFilter[] {
  const { filters, onFiltersChange } = options;
  const { t } = useLingui();
  const updatedWithinLabels: Record<CatalogUpdatedWithin, string> = {
    any: "",
    pastMonth: t`Updated in the past month`,
    pastYear: t`Updated in the past year`,
    overAYear: t`Updated over a year ago`,
  };
  const chipOptions = { filters, onFiltersChange };
  return [
    // Publishers, agencies, and formats read as themselves. A topic and a
    // keyword can share a word, so those two say which one they are.
    ..._buildValueChips({ ...chipOptions, key: "sources" }),
    ..._buildValueChips({ ...chipOptions, key: "organization2Names" }),
    ..._buildValueChips({
      ...chipOptions,
      key: "domains",
      toLabel: (topic) => {
        return t`Topic: ${topic}`;
      },
    }),
    ..._buildValueChips({
      ...chipOptions,
      key: "tags",
      toLabel: (keyword) => {
        return t`Keyword: ${keyword}`;
      },
    }),
    ..._buildValueChips({ ...chipOptions, key: "formats" }),
    ..._buildSettingChips({
      ...chipOptions,
      labels: {
        updatedWithin: updatedWithinLabels[filters.updatedWithin],
        showingUnloadable: t`Including datasets that can't be loaded`,
      },
    }),
  ];
}
