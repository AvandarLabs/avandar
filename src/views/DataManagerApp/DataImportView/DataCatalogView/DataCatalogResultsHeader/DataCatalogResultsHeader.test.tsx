import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataCatalogResultsHeader } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogResultsHeader/DataCatalogResultsHeader";

describe("DataCatalogResultsHeader", () => {
  it("removes an active filter through its accessible remove button", () => {
    const onRemove = vi.fn();
    render(
      <DataCatalogResultsHeader
        numResults={3}
        isNumResultsCapped={false}
        numCatalogListings={10}
        isNarrowed
        activeFilters={[
          { key: "domains:Health", label: "Topic: Health", onRemove },
        ]}
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

  it("says the count is a floor when more datasets match than were counted", () => {
    render(
      <DataCatalogResultsHeader
        numResults={10000}
        isNumResultsCapped
        numCatalogListings={2000000}
        isNarrowed
        activeFilters={[]}
        onClearAll={vi.fn()}
        sortBy="updated"
        isSearching={false}
        onSortByChange={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent(
      "10,000+ of 2,000,000 datasets",
    );
  });
});
