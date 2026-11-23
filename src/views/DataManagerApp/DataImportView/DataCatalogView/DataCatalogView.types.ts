import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CatalogListingFilters,
  CatalogSortBy,
} from "./catalogListingFilters/catalogListingFilters";
import type { DataCatalogListingDetail } from "./DataCatalogListingDetail/DataCatalogListingDetail";
import type { useActiveCatalogFilters } from "./useActiveCatalogFilters/useActiveCatalogFilters";
import type { useDataCatalogSearch } from "./useDataCatalogSearch/useDataCatalogSearch";
import type { BoxProps } from "@mantine/core";
import type {
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";

/** Search inputs and lifecycle callbacks accepted by DataCatalogView. */
export type DataCatalogViewProps = BoxProps & {
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

/** Catalog browsing state and actions consumed by DataCatalogView. */
export type DataCatalogViewState = {
  requestDatasetButton: ReactNode;
  isCatalogEmpty: boolean;
  search: string;
  onSearchChange: DataCatalogViewProps["onSearchChange"];
  className: string | undefined;
  boxProps: BoxProps;
  filters: CatalogListingFilters;
  setFilters: Dispatch<SetStateAction<CatalogListingFilters>>;
  setChosenSortBy: Dispatch<SetStateAction<CatalogSortBy | undefined>>;
  isFilterDrawerOpen: boolean;
  setIsFilterDrawerOpen: Dispatch<SetStateAction<boolean>>;
  isDetailExpanded: boolean;
  setIsDetailExpanded: Dispatch<SetStateAction<boolean>>;
  selectedId: DataCatalogListing.Id | undefined;
  setSelectedId: Dispatch<SetStateAction<DataCatalogListing.Id | undefined>>;
  isSearching: boolean;
  sortBy: CatalogSortBy;
  catalogSearch: ReturnType<typeof useDataCatalogSearch>;
  isLoadingCatalog: boolean;
  activeFilters: ReturnType<typeof useActiveCatalogFilters>;
  isSelectionShown: boolean;
  isLoadingSelectedListing: boolean;
  selectedListing: DataCatalogListing.T | undefined;
  hasNoMatches: boolean;
  detailProps: ComponentProps<typeof DataCatalogListingDetail>;
  filterRail: ReactNode;
};
