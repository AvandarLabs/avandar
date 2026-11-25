import { describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { EMPTY_CATALOG_LISTING_FILTERS } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { useActiveCatalogFilters } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useActiveCatalogFilters/useActiveCatalogFilters";
import type { CatalogListingFilters } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";

function _renderActiveFilterLabels(
  filters: Partial<CatalogListingFilters>,
): string[] {
  const { result } = renderHook(
    () => {
      return useActiveCatalogFilters({
        filters: { ...EMPTY_CATALOG_LISTING_FILTERS, ...filters },
        onFiltersChange: vi.fn(),
      });
    },
    { wrapper: TestProviders },
  );
  return result.current.map((activeFilter) => {
    return activeFilter.label;
  });
}

describe("useActiveCatalogFilters", () => {
  it("labels a topic and a keyword with the same text apart", () => {
    expect(
      _renderActiveFilterLabels({ domains: ["Health"], tags: ["Health"] }),
    ).toEqual(["Topic: Health", "Keyword: Health"]);
  });

  it("labels publishers, agencies, and formats with their raw values", () => {
    expect(
      _renderActiveFilterLabels({
        sources: ["City of New York"],
        organization2Names: ["Department of Health"],
        formats: ["CSV"],
      }),
    ).toEqual(["City of New York", "Department of Health", "CSV"]);
  });

  it("removes only the chip's own value when a chip is removed", () => {
    const onFiltersChange = vi.fn();
    const { result } = renderHook(
      () => {
        return useActiveCatalogFilters({
          filters: { ...EMPTY_CATALOG_LISTING_FILTERS, tags: ["fhv", "taxi"] },
          onFiltersChange,
        });
      },
      { wrapper: TestProviders },
    );

    result.current[0]?.onRemove();

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["taxi"] }),
    );
  });
});
