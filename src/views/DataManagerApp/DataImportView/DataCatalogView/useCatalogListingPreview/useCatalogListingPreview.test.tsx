import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCatalogListingPreview } from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";
import { renderHook, waitFor } from "@/test-utils";
import { useCatalogListingPreview } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingPreview/useCatalogListingPreview";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { CatalogListingPreview } from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";
import type { ReactNode } from "react";

vi.mock(
  "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview")
      >();
    return {
      ...actual,
      fetchCatalogListingPreview: vi.fn(),
    };
  },
);

const STORED_PREVIEW: CatalogListingPreview = {
  columnNames: ["country"],
  dateColumnNames: [],
  rows: [{ country: "Chad" }],
};

const LIVE_PREVIEW: CatalogListingPreview = {
  columnNames: ["country"],
  dateColumnNames: [],
  rows: [{ country: "Niger" }],
};

function _listing(
  overrides: Partial<DataCatalogListing.T> = {},
): DataCatalogListing.T {
  return {
    id: "listing-1" as DataCatalogListing.Id,
    accessKind: "api_resource",
    apiResourceFormat: "CSV",
    isInvalid: false,
    isWorkspaceLoadable: true,
    parquetCacheFolderPath: "catalog-cache/listing-1/build-1",
    canonicalUrls: undefined,
    dateColumnTypeLastVerified: "2026-11-01T00:00:00.000Z",
    dateOfLastUpdate: "2026-10-01T00:00:00.000Z",
    ...overrides,
  } as DataCatalogListing.T;
}

function _dueListing(): DataCatalogListing.T {
  return _listing({
    dateColumnTypeLastVerified: "2026-09-01T00:00:00.000Z",
  });
}

function _render(
  listing: DataCatalogListing.T | undefined,
  options?: { isRecheckingColumns?: boolean },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(
    () => {
      return useCatalogListingPreview(listing, options);
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        );
      },
    },
  );
}

describe("useCatalogListingPreview", () => {
  beforeEach(() => {
    vi.mocked(fetchCatalogListingPreview).mockReset();
  });

  it("previews a stored copy and does not read the API when columns are current", async () => {
    vi.mocked(fetchCatalogListingPreview).mockResolvedValue(STORED_PREVIEW);

    const { result } = _render(_listing());

    await waitFor(() => {
      expect(result.current.preview).toEqual(STORED_PREVIEW);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(fetchCatalogListingPreview).toHaveBeenCalledTimes(1);
    expect(fetchCatalogListingPreview).not.toHaveBeenCalledWith(
      expect.objectContaining({ source: "live-sample" }),
    );
  });

  it("shows the stored copy while a column recheck is in flight, then the API rows when they differ", async () => {
    let resolveStored: (preview: CatalogListingPreview) => void = () => {};
    const storedPromise = new Promise<CatalogListingPreview>((resolve) => {
      resolveStored = resolve;
    });
    let resolveLive: (preview: CatalogListingPreview) => void = () => {};
    const livePromise = new Promise<CatalogListingPreview>((resolve) => {
      resolveLive = resolve;
    });
    vi.mocked(fetchCatalogListingPreview).mockImplementation((options) => {
      if (options.source === "live-sample") {
        return livePromise;
      }
      return storedPromise;
    });

    const { result } = _render(_dueListing(), { isRecheckingColumns: true });

    resolveStored(STORED_PREVIEW);
    await waitFor(() => {
      expect(result.current.preview).toEqual(STORED_PREVIEW);
    });
    expect(result.current.isLoading).toBe(false);
    expect(fetchCatalogListingPreview).toHaveBeenCalledWith(
      expect.objectContaining({ source: "live-sample" }),
    );

    resolveLive(LIVE_PREVIEW);
    await waitFor(() => {
      expect(result.current.preview).toEqual(LIVE_PREVIEW);
    });
    expect(result.current.isError).toBe(false);
  });

  it("keeps the stored copy when a column recheck reads the same rows", async () => {
    vi.mocked(fetchCatalogListingPreview).mockImplementation((options) => {
      if (options.source === "live-sample") {
        return Promise.resolve({
          columnNames: [...STORED_PREVIEW.columnNames],
          dateColumnNames: [...STORED_PREVIEW.dateColumnNames],
          rows: STORED_PREVIEW.rows.map((row) => {
            return { ...row };
          }),
        });
      }
      return Promise.resolve(STORED_PREVIEW);
    });

    const { result } = _render(_dueListing(), { isRecheckingColumns: true });

    await waitFor(() => {
      expect(fetchCatalogListingPreview).toHaveBeenCalledWith(
        expect.objectContaining({ source: "live-sample" }),
      );
    });
    await waitFor(() => {
      expect(result.current.preview).toBe(STORED_PREVIEW);
    });
  });

  it("keeps the stored copy when the column recheck cannot read the API", async () => {
    vi.mocked(fetchCatalogListingPreview).mockImplementation((options) => {
      if (options.source === "live-sample") {
        return Promise.reject(new Error("sample failed"));
      }
      return Promise.resolve(STORED_PREVIEW);
    });

    const { result } = _render(_dueListing(), { isRecheckingColumns: true });

    await waitFor(() => {
      expect(result.current.preview).toBe(STORED_PREVIEW);
    });
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps the API rows after the column recheck is no longer due", async () => {
    vi.mocked(fetchCatalogListingPreview).mockImplementation((options) => {
      if (options.source === "live-sample") {
        return Promise.resolve(LIVE_PREVIEW);
      }
      return Promise.resolve(STORED_PREVIEW);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result, rerender } = renderHook(
      ({
        listing,
        isRecheckingColumns,
      }: {
        listing: DataCatalogListing.T;
        isRecheckingColumns: boolean;
      }) => {
        return useCatalogListingPreview(listing, { isRecheckingColumns });
      },
      {
        initialProps: {
          listing: _dueListing(),
          isRecheckingColumns: true,
        },
        wrapper: ({ children }: { children: ReactNode }) => {
          return (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );
        },
      },
    );

    await waitFor(() => {
      expect(result.current.preview).toEqual(LIVE_PREVIEW);
    });
    rerender({
      listing: _listing({
        dateColumnTypeLastVerified: "2026-11-02T00:00:00.000Z",
      }),
      isRecheckingColumns: false,
    });

    expect(result.current.preview).toEqual(LIVE_PREVIEW);
    expect(fetchCatalogListingPreview).toHaveBeenCalledTimes(2);
  });

  it("does not read the API for a stored copy before a column recheck starts", async () => {
    vi.mocked(fetchCatalogListingPreview).mockResolvedValue(STORED_PREVIEW);

    const { result } = _render(_dueListing());

    await waitFor(() => {
      expect(result.current.preview).toEqual(STORED_PREVIEW);
    });
    expect(fetchCatalogListingPreview).not.toHaveBeenCalledWith(
      expect.objectContaining({ source: "live-sample" }),
    );
  });

  it("reads the API when a CSV listing has no stored copy", async () => {
    vi.mocked(fetchCatalogListingPreview).mockResolvedValue(LIVE_PREVIEW);

    const { result } = _render(
      _listing({
        parquetCacheFolderPath: undefined,
        dateColumnTypeLastVerified: "2026-11-01T00:00:00.000Z",
      }),
    );

    await waitFor(() => {
      expect(result.current.preview).toEqual(LIVE_PREVIEW);
    });
    expect(fetchCatalogListingPreview).toHaveBeenCalledTimes(1);
    expect(fetchCatalogListingPreview).toHaveBeenCalledWith(
      expect.objectContaining({ source: "live-sample" }),
    );
  });
});
