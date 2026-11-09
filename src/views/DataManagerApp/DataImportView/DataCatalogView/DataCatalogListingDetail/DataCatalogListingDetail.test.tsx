import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { DataCatalogListingDetail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail";
import type { DataCatalogDrive } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { CatalogListingPreviewState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingPreview/useCatalogListingPreview";
import type { ReactElement } from "react";

const NYC_DRIVE: DataCatalogDrive.T = {
  id: "drive-nyc" as DataCatalogDrive.Id,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  pipelineName: "socrata",
  driveKey: "https://data.cityofnewyork.us",
  organization1Label: "City",
  organization2Label: "Agency",
  organization3Label: undefined,
  organization4Label: undefined,
};

/**
 * A listing with nothing optional set, so each test turns on only the
 * metadata it is about.
 */
function _createListing(
  overrides: Partial<DataCatalogListing.T> = {},
): DataCatalogListing.T {
  return {
    id: "listing-fhv" as DataCatalogListing.Id,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    dateOfLastSync: undefined,
    dateOfLastUpdate: undefined,
    coverageStartDate: undefined,
    coverageEndDate: undefined,
    parquetFileName: undefined,
    displayName: "Active For-Hire Vehicles (FHV)",
    pipelineName: undefined,
    pipelineRunId: undefined,
    organization1Name: "City of New York",
    externalServiceName: undefined,
    externalDatasetId: undefined,
    sourceUrl: undefined,
    canonicalUrls: undefined,
    license: undefined,
    updateFrequency: undefined,
    description: undefined,
    notes: undefined,
    metadata: undefined,
    accessKind: "api_resource",
    apiService: undefined,
    apiBaseUrl: undefined,
    apiResourceId: undefined,
    apiResourceFormat: "CSV",
    parquetCacheStatus: undefined,
    parquetCacheBuildId: undefined,
    parquetCacheBuildStartedAt: undefined,
    parquetCacheFailureCode: undefined,
    parquetCacheFolderPath: undefined,
    parquetCachePartCount: undefined,
    parquetCacheSourceVersion: undefined,
    parquetCacheBuiltAt: undefined,
    parquetCacheRowCount: undefined,
    parquetCacheByteSize: undefined,
    pipelineScopeKeys: [],
    dateColumnTypeLastVerified: undefined,
    isInvalid: false,
    invalidDatasetReason: undefined,
    isWorkspaceLoadable: true,
    sourceAssetType: undefined,
    sourceDownloadUrl: undefined,
    organization2Name: undefined,
    organization3Name: undefined,
    organization4Name: undefined,
    domains: undefined,
    tags: undefined,
    additionalSourceMetadata: undefined,
    driveId: undefined,
    ...overrides,
  };
}

type DetailOptions = {
  listing: DataCatalogListing.T;
  drive?: DataCatalogDrive.T;
  onSelectTopic?: (domain: string) => void;
  onAddKeyword?: (tag: string) => void;
  preview?: CatalogListingPreviewState;
  isExpanded?: boolean;
  onExpand?: () => void;
};

const NO_PREVIEW: CatalogListingPreviewState = {
  preview: undefined,
  isLoading: false,
  isError: false,
  isAvailable: false,
};

function _buildDetail(options: DetailOptions): ReactElement {
  return (
    <DataCatalogListingDetail
      listing={options.listing}
      drive={options.drive}
      columns={[]}
      columnTypeState="verified"
      isAddAllowed
      isAdding={false}
      isWaitingForColumnTypes={false}
      isLoadingColumnMetadata={false}
      onAddToWorkspace={vi.fn()}
      onBack={vi.fn()}
      onSelectTopic={options.onSelectTopic ?? vi.fn()}
      onAddKeyword={options.onAddKeyword ?? vi.fn()}
      preview={options.preview ?? NO_PREVIEW}
      isExpanded={options.isExpanded}
      onExpand={options.onExpand}
    />
  );
}

function _renderDetail(options: DetailOptions): ReturnType<typeof render> {
  return render(_buildDetail(options));
}

/** The value a fact shows beside the given label. */
function _getFactValue(label: string): string | null | undefined {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling
    ?.textContent;
}

describe("DataCatalogListingDetail", () => {
  it("shows the listing's first rows, saying the preview holds only those", () => {
    _renderDetail({
      listing: _createListing(),
      preview: {
        preview: {
          columnNames: ["country"],
          dateColumnNames: [],
          rows: Array.from({ length: 200 }, () => {
            return { country: "Chad" };
          }),
        },
        isLoading: false,
        isError: false,
        isAvailable: true,
      },
    });

    expect(screen.getByText("Data preview")).toBeInTheDocument();
    expect(screen.getByText("First 200 rows")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This preview shows only the first 200 rows of the dataset.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the preview after date column names were saved and read back as JSON", () => {
    // A Set becomes {} in the persisted query cache. That is what the grid
    // reads the next time this listing is opened.
    const storedPreview = JSON.parse(
      JSON.stringify({
        columnNames: ["boro_name"],
        dateColumnNames: new Set<string>(),
        rows: [{ boro_name: "Bronx" }],
      }),
    );
    _renderDetail({
      listing: _createListing({ displayName: "Borough boundaries" }),
      preview: {
        preview: storedPreview,
        isLoading: false,
        isError: false,
        isAvailable: true,
      },
    });

    expect(screen.getByText("Data preview")).toBeInTheDocument();
    expect(screen.getByText("First 1 rows")).toBeInTheDocument();
  });

  it("shows the preview when date column names are a list", () => {
    _renderDetail({
      listing: _createListing(),
      preview: {
        preview: {
          columnNames: ["boro_name", "report_date"],
          dateColumnNames: ["report_date"],
          rows: [{ boro_name: "Bronx", report_date: Date.UTC(2022, 0, 1) }],
        },
        isLoading: false,
        isError: false,
        isAvailable: true,
      },
    });

    expect(screen.getByText("Data preview")).toBeInTheDocument();
    expect(screen.getByText("First 1 rows")).toBeInTheDocument();
  });

  it("leaves the preview out for a listing with no data to read", () => {
    _renderDetail({ listing: _createListing({ isWorkspaceLoadable: false }) });

    expect(screen.queryByText("Data preview")).toBeNull();
  });

  it("opens the listing in full screen from the expand button", () => {
    const onExpand = vi.fn();
    _renderDetail({ listing: _createListing(), onExpand });

    fireEvent.click(
      screen.getByRole("button", { name: "Open in full screen" }),
    );

    expect(onExpand).toHaveBeenCalledOnce();
  });

  it("drops the expand button once expanded", () => {
    _renderDetail({
      listing: _createListing(),
      onExpand: vi.fn(),
      isExpanded: true,
    });

    expect(
      screen.queryByRole("button", { name: "Open in full screen" }),
    ).toBeNull();
  });

  it("labels each organization level with the drive's name for it", () => {
    _renderDetail({
      listing: _createListing({
        organization2Name: "Taxi and Limousine Commission (TLC)",
      }),
      drive: NYC_DRIVE,
    });

    expect(_getFactValue("City")).toBe("City of New York");
    expect(_getFactValue("Agency")).toBe("Taxi and Limousine Commission (TLC)");
  });

  it("labels organization levels Organization and Level {n} without a drive", () => {
    _renderDetail({
      listing: _createListing({
        organization1Name: "World Bank",
        organization3Name: "Development Data Group",
      }),
    });

    expect(_getFactValue("Organization")).toBe("World Bank");
    expect(_getFactValue("Level 3")).toBe("Development Data Group");
  });

  it("joins the organizations and the update date in the line under the title", () => {
    _renderDetail({
      listing: _createListing({
        organization2Name: "Taxi and Limousine Commission (TLC)",
        dateOfLastUpdate: "2026-11-06T12:00:00Z",
      }),
    });

    expect(
      screen.getByText(
        "Taxi and Limousine Commission (TLC) · City of New York · Updated Nov 6, 2026",
      ),
    ).toBeInTheDocument();
  });

  it("calls onSelectTopic with a clicked topic", () => {
    const onSelectTopic = vi.fn();
    _renderDetail({
      listing: _createListing({ domains: ["Transportation"] }),
      onSelectTopic,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Show datasets in Transportation" }),
    );

    expect(onSelectTopic).toHaveBeenCalledWith("Transportation");
  });

  it("calls onAddKeyword with a clicked keyword", () => {
    const onAddKeyword = vi.fn();
    _renderDetail({
      listing: _createListing({ tags: ["fhv", "taxi"] }),
      onAddKeyword,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Show datasets tagged taxi" }),
    );

    expect(onAddKeyword).toHaveBeenCalledWith("taxi");
  });

  it("shows the first eight keywords until more are asked for", () => {
    _renderDetail({
      listing: _createListing({
        tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
      }),
    });

    expect(
      screen.queryByRole("button", { name: "Show datasets tagged i" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show 2 more" }),
    ).toBeInTheDocument();
  });

  it("folds the keywords again when another listing opens", () => {
    const tags = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const { rerender } = _renderDetail({ listing: _createListing({ tags }) });
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));

    rerender(
      _buildDetail({
        listing: _createListing({
          id: "listing-other" as DataCatalogListing.Id,
          tags,
        }),
      }),
    );

    expect(
      screen.getByRole("button", { name: "Show 2 more" }),
    ).toBeInTheDocument();
  });

  it("omits a group with no facts along with its title", () => {
    _renderDetail({ listing: _createListing() });

    expect(
      screen.queryByRole("heading", { name: "Source" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "About" }),
    ).not.toBeInTheDocument();
  });

  it("names the Original link by its host", () => {
    _renderDetail({
      listing: _createListing({
        sourceUrl: "https://data.cityofnewyork.us/Transportation/fhv/8wbx",
      }),
    });

    expect(
      screen.getByRole("link", { name: "data.cityofnewyork.us" }),
    ).toHaveAttribute(
      "href",
      "https://data.cityofnewyork.us/Transportation/fhv/8wbx",
    );
  });

  it("labels the Download link with the listing's format", () => {
    _renderDetail({
      listing: _createListing({
        sourceDownloadUrl: "https://data.cityofnewyork.us/fhv.csv",
      }),
    });

    expect(screen.getByRole("link", { name: "CSV" })).toHaveAttribute(
      "href",
      "https://data.cityofnewyork.us/fhv.csv",
    );
  });

  it("keeps the technical details hidden until they are opened", async () => {
    _renderDetail({
      listing: _createListing({
        pipelineName: "socrata",
        pipelineRunId: "run-42",
      }),
    });
    const toggle = screen.getByRole("button", { name: "Technical details" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("socrata")).not.toBeVisible();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // The disclosure opens on the next animation frame.
    await waitFor(() => {
      expect(screen.getByText("socrata")).toBeVisible();
    });
  });

  it("shows what else the source says rather than the listing's metadata", async () => {
    _renderDetail({
      listing: _createListing({
        additionalSourceMetadata: { resource: { id: "8wbx-tsch" } },
        metadata: { ignored: true },
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Technical details" }));

    expect(
      await screen.findByRole("figure", { name: "More from the source" }),
    ).toHaveTextContent('"id": "8wbx-tsch"');
  });
});
