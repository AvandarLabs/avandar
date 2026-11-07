import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataCatalogResultsHeader } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";

describe("DataCatalogResultsHeader", () => {
  it("removes an active filter through its accessible remove button", () => {
    const onRemove = vi.fn();
    render(
      <DataCatalogResultsHeader
        numResults={3}
        numCatalogListings={10}
        isNarrowed
        activeFilters={[{ key: "domains:Health", label: "Topic: Health", onRemove }]}
        onClearAll={vi.fn()}
        sortBy="updated"
        isSearching={false}
        onSortByChange={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter: Topic: Health" }),
    );

    expect(onRemove).toHaveBeenCalledOnce();
  });
});
