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

  it("counts the datasets in view without the catalog total", () => {
    render(
      <DataCatalogResultsHeader
        numResults={3}
        isNumResultsCapped={false}
        activeFilters={[]}
        onClearAll={vi.fn()}
        sortBy="updated"
        isSearching={false}
        onSortByChange={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent(/^3 datasets$/);
  });

  it("says the count is a floor when more datasets match than were counted", () => {
    render(
      <DataCatalogResultsHeader
        numResults={10000}
        isNumResultsCapped
        activeFilters={[]}
        onClearAll={vi.fn()}
        sortBy="updated"
        isSearching={false}
        onSortByChange={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent(
      /^10,000\+ datasets$/,
    );
  });
});
