import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatContextSearch } from "@/components/ChatPanel/ChatThread/ChatContextTray/useChatContextSearch";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { searchGadgets: vi.fn(), getIsOnline: vi.fn() };
});

vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@avandar/browser-utils")>();
  return { ...actual, getIsOnline: mocks.getIsOnline };
});

vi.mock("@/clients/gadgets/searchGadgets/searchGadgets", () => {
  return { searchGadgets: mocks.searchGadgets };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "33333333-3333-4333-8333-333333333333" };
    },
  };
});

const DATASET_RESULT: GadgetSearchResult = {
  ref: {
    gadgetType: "dataset",
    gadgetId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    subId: null,
  },
  label: "US deaths",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const CASE_RESULT: GadgetSearchResult = {
  ref: {
    gadgetType: "individual",
    gadgetId: "dddddddd-4444-4444-8444-dddddddddddd",
    subId: null,
  },
  label: "Jane Doe",
  subLabel: "Measles case",
  hasLimitedAudience: false,
};

let queryClient: QueryClient;

function _renderSearch(query: string, isEnabled = true) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <TestProviders>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </TestProviders>
    );
  };
  return renderHook(
    (props: { query: string; isEnabled: boolean }) => {
      return useChatContextSearch(props.query, { isEnabled: props.isEnabled });
    },
    { wrapper, initialProps: { query, isEnabled } },
  );
}

beforeEach(() => {
  mocks.getIsOnline.mockReset();
  mocks.getIsOnline.mockReturnValue(true);
  mocks.searchGadgets.mockReset();
});

describe("useChatContextSearch", () => {
  it("drops cases from the results", async () => {
    mocks.searchGadgets.mockResolvedValue([CASE_RESULT, DATASET_RESULT]);

    const { result } = _renderSearch("us");

    await waitFor(() => {
      expect(result.current.results).toEqual([DATASET_RESULT]);
    });
    expect(result.current.searchFailed).toBe(false);
  });

  it("sends a blank query as an empty string with every type's rows", async () => {
    mocks.searchGadgets.mockResolvedValue([]);

    _renderSearch("   ");

    await waitFor(() => {
      expect(mocks.searchGadgets).toHaveBeenCalledTimes(1);
    });
    expect(mocks.searchGadgets).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "33333333-3333-4333-8333-333333333333",
        query: "",
        limit: 30,
      }),
    );
  });

  it("does not search while it is off", async () => {
    mocks.searchGadgets.mockResolvedValue([]);

    const { result } = _renderSearch("us", false);

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
    expect(mocks.searchGadgets).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("keeps results out of the persisted cache and refreshes them", async () => {
    mocks.searchGadgets.mockResolvedValue([DATASET_RESULT]);

    const { result } = _renderSearch("us");

    await waitFor(() => {
      expect(result.current.results).toEqual([DATASET_RESULT]);
    });
    const [query] = queryClient.getQueryCache().getAll();
    expect(query?.meta).toEqual({ persist: false });
    const staleTime = query?.observers[0]?.options.staleTime;
    if (typeof staleTime !== "function") {
      throw new Error("Expected staleTime to depend on being online");
    }
    expect(staleTime(query!)).toBe(30_000);
    mocks.getIsOnline.mockReturnValue(false);
    expect(staleTime(query!)).toBe(Number.POSITIVE_INFINITY);
  });

  it("reports a failed search without the generic error popup", async () => {
    const onError = vi.fn();
    mocks.searchGadgets.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(
      () => {
        return useChatContextSearch("us", { isEnabled: true });
      },
      {
        wrapper: ({ children }: { children: ReactNode }) => {
          return (
            <AvaQueryProvider onError={onError}>
              <QueryClientProvider
                client={
                  new QueryClient({
                    defaultOptions: { queries: { retry: false } },
                  })
                }
              >
                {children}
              </QueryClientProvider>
            </AvaQueryProvider>
          );
        },
      },
    );

    await waitFor(() => {
      expect(result.current.searchFailed).toBe(true);
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a failed search", async () => {
    mocks.searchGadgets.mockRejectedValue(new Error("offline"));

    const { result } = _renderSearch("us");

    await waitFor(() => {
      expect(result.current.searchFailed).toBe(true);
    });
    expect(result.current.isSearching).toBe(false);
  });

  it("counts as searching while the typed query waits for its debounce", async () => {
    mocks.searchGadgets.mockResolvedValue([DATASET_RESULT]);
    const { result, rerender } = _renderSearch("us");
    await waitFor(() => {
      expect(result.current.results).toEqual([DATASET_RESULT]);
    });

    rerender({ query: "us deaths", isEnabled: true });

    expect(result.current.isSearching).toBe(true);
    await waitFor(() => {
      expect(mocks.searchGadgets).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: "us deaths" }),
      );
    });
  });
});
