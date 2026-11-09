import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { DataCatalogListingList } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList.module.css";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

vi.mock("@tanstack/react-virtual", () => {
  return {
    useVirtualizer: (options: { count: number }) => {
      return {
        getTotalSize: () => {
          return options.count * 60;
        },
        getVirtualItems: () => {
          return Array.from({ length: options.count }, (_, index) => {
            return {
              index,
              key: String(index),
              start: index * 60,
              size: 60,
              end: (index + 1) * 60,
              lane: 0,
            };
          });
        },
        measureElement: () => {},
        scrollToIndex: () => {},
      };
    },
  };
});

const LONG_NAME =
  "Hospital Inpatient Discharges (SPARCS De-Identified): Adult Prevention Quality Indicators (PQI) by Zip Code";

function _createListing(displayName: string): DataCatalogListing.SearchResult {
  return {
    id: displayName as DataCatalogListing.Id,
    displayName,
    organization1Name: "City of New York",
    organization2Name: "Department of Health",
    organization3Name: undefined,
    organization4Name: undefined,
    pipelineName: undefined,
    isWorkspaceLoadable: true,
    isInvalid: false,
    fileFormat: "CSV",
    lastUpdatedAt: undefined,
  };
}

describe("DataCatalogListingList", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(480);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(160);
  });

  it("clips a long dataset name to one line and shows the full name on hover", async () => {
    render(
      <DataCatalogListingList
        displayedListings={[_createListing(LONG_NAME)]}
        totalCount={1}
        selectedId={undefined}
        onSelect={vi.fn()}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    );

    const name = screen.getByText(LONG_NAME);
    expect(name).toHaveClass(css.dataCatalogListingListName);

    act(() => {
      fireEvent.mouseEnter(name);
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(LONG_NAME);
    });
  });
});
