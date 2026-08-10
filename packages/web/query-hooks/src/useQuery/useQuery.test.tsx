import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaQueryProvider } from "@query-hooks/AvaQueryProvider";
import { useQuery } from "@query-hooks/useQuery/useQuery";
import type { ReactElement, ReactNode } from "react";

const showMock = vi.fn();

function _wrapperForHook(options: { children: ReactNode }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(
    QueryClientProvider,
    { client },
    createElement(AvaQueryProvider, {
      onError: showMock,
      children: options.children,
    }),
  );
}

describe("useQuery", () => {
  beforeEach(() => {
    showMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns a [data, isLoading, queryResult] tuple", async () => {
    const { result } = renderHook(
      () => {
        return useQuery({
          queryKey: ["widgets"],
          queryFn: async () => {
            return "hello";
          },
        });
      },
      { wrapper: _wrapperForHook },
    );

    // starts loading with no data
    expect(result.current[0]).toBeUndefined();
    expect(result.current[1]).toBe(true);

    await waitFor(() => {
      expect(result.current[0]).toBe("hello");
    });
    expect(result.current[1]).toBe(false);
    expect(result.current[2].data).toBe("hello");
  });

  it("passes the query key through to the query function", async () => {
    const queryFn = vi.fn().mockResolvedValue(1);
    renderHook(
      () => {
        return useQuery({ queryKey: ["a", "b"], queryFn });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    });
    expect(queryFn.mock.calls[0]?.[0]).toMatchObject({ queryKey: ["a", "b"] });
  });

  it("re-throws errors from the query function so the query lands in an error state", async () => {
    const error = new Error("boom");
    const { result } = renderHook(
      () => {
        return useQuery({
          queryKey: ["fails"],
          queryFn: async () => {
            throw error;
          },
        });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[2].isError).toBe(true);
    });
    expect(result.current[2].error).toBe(error);
    expect(result.current[0]).toBeUndefined();
  });

  it("shows a notification carrying the error message when the query function throws", async () => {
    const { result } = renderHook(
      () => {
        return useQuery({
          queryKey: ["fails-notify"],
          queryFn: async () => {
            throw new Error("specific failure");
          },
        });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[2].isError).toBe(true);
    });
    expect(showMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "specific failure" }),
    );
  });

  it("falls back to a generic message when a non-Error value is thrown", async () => {
    const { result } = renderHook(
      () => {
        return useQuery({
          queryKey: ["throws-string"],
          queryFn: async () => {
            throw "just a string";
          },
        });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[2].isError).toBe(true);
    });
    expect(showMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Unknown error encountered" }),
    );
  });

  it("does not notify when the query function succeeds", async () => {
    const { result } = renderHook(
      () => {
        return useQuery({
          queryKey: ["ok"],
          queryFn: async () => {
            return "fine";
          },
        });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[0]).toBe("fine");
    });
    expect(showMock).not.toHaveBeenCalled();
  });

  it("keeps the previous data as placeholder across key changes when usePreviousDataAsPlaceholder is set", async () => {
    const { result, rerender } = renderHook(
      (props: { id: number }) => {
        return useQuery({
          queryKey: ["item", props.id],
          usePreviousDataAsPlaceholder: true,
          queryFn: async () => {
            return `item-${props.id}`;
          },
        });
      },
      { wrapper: _wrapperForHook, initialProps: { id: 1 } },
    );

    await waitFor(() => {
      expect(result.current[0]).toBe("item-1");
    });

    rerender({ id: 2 });
    // the previous value stands in instead of dropping to undefined
    expect(result.current[0]).toBe("item-1");

    await waitFor(() => {
      expect(result.current[0]).toBe("item-2");
    });
  });

  it("drops to undefined across key changes when usePreviousDataAsPlaceholder is not set", async () => {
    const { result, rerender } = renderHook(
      (props: { id: number }) => {
        return useQuery({
          queryKey: ["plain", props.id],
          queryFn: async () => {
            return `item-${props.id}`;
          },
        });
      },
      { wrapper: _wrapperForHook, initialProps: { id: 1 } },
    );

    await waitFor(() => {
      expect(result.current[0]).toBe("item-1");
    });

    rerender({ id: 2 });
    expect(result.current[0]).toBeUndefined();
  });
});
