import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaQueryProvider } from "@query-hooks/AvaQueryProvider";
import { useMutation } from "@query-hooks/useMutation/useMutation";
import type { ReactElement, ReactNode } from "react";

const { notifyErrorMock } = vi.hoisted(() => {
  return { notifyErrorMock: vi.fn() };
});

let queryClient: QueryClient;

function _wrapperForHook(options: { children: ReactNode }): ReactElement {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(AvaQueryProvider, {
      onError: notifyErrorMock,
      children: options.children,
    }),
  );
}

function _renderUseMutation<TData, TVars>(
  options: Parameters<typeof useMutation<TData, TVars>>[0],
) {
  return renderHook(
    () => {
      return useMutation<TData, TVars>(options);
    },
    { wrapper: _wrapperForHook },
  );
}

describe("useMutation", () => {
  beforeEach(() => {
    notifyErrorMock.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("returns a [mutate, isPending, mutationResult] tuple", async () => {
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "done";
      },
    });

    expect(typeof result.current[0]).toBe("function");
    expect(result.current[1]).toBe(false);

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(result.current[2].data).toBe("done");
    });
    expect(result.current[1]).toBe(false);
  });

  it("exposes mutate.async returning a promise that resolves to the result", async () => {
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "async-result";
      },
    });

    await waitFor(() => {
      expect(result.current[0].async).toBeTypeOf("function");
    });

    const value = await act(async () => {
      return await result.current[0].async();
    });
    expect(value).toBe("async-result");
  });

  it("passes mutation variables through to the mutation function", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = _renderUseMutation<string, { id: number }>({
      mutationFn,
    });

    act(() => {
      result.current[0]({ id: 7 });
    });

    // Tanstack v5 invokes mutationFn as (variables, context), so assert on the
    // first argument rather than the whole call signature.
    await waitFor(() => {
      expect(mutationFn).toHaveBeenCalled();
    });
    expect(mutationFn.mock.calls[0]?.[0]).toEqual({ id: 7 });
  });

  it("invalidates the single queryToInvalidate on success", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "ok";
      },
      queryToInvalidate: ["widgets"],
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["widgets"] });
    });
  });

  it("invalidates every key in queriesToInvalidate on success", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "ok";
      },
      queriesToInvalidate: [["a"], ["b"]],
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["a"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["b"] });
  });

  it("lets queriesToInvalidate take precedence over queryToInvalidate", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "ok";
      },
      queryToInvalidate: ["ignored"],
      queriesToInvalidate: [["winner"]],
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["winner"] });
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ["ignored"] });
  });

  it("refetches the single queryToRefetch on success", async () => {
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "ok";
      },
      queryToRefetch: ["widgets"],
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ["widgets"] });
    });
  });

  it("lets queriesToRefetch take precedence over queryToRefetch", async () => {
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "ok";
      },
      queryToRefetch: ["ignored"],
      queriesToRefetch: [["winner"]],
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ["winner"] });
    });
    expect(refetchSpy).not.toHaveBeenCalledWith({ queryKey: ["ignored"] });
  });

  it("still calls a user-supplied onSuccess", async () => {
    const onSuccess = vi.fn();
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        return "ok";
      },
      queryToInvalidate: ["widgets"],
      onSuccess,
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(onSuccess.mock.calls[0]?.[0]).toBe("ok");
  });

  it("notifies with the error message when the mutation fails and no onError is given", async () => {
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        throw new Error("mutation exploded");
      },
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalled();
    });
    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "mutation exploded" }),
    );
  });

  it("falls back to a generic message when a non-Error value is thrown", async () => {
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        throw "a bare string";
      },
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalled();
    });
    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Unknown error encountered" }),
    );
  });

  it("calls a user-supplied onError instead of the default notification", async () => {
    const onError = vi.fn();
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        throw new Error("handled by caller");
      },
      onError,
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("does not invalidate when the mutation fails", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderUseMutation<string, void>({
      mutationFn: async () => {
        throw new Error("nope");
      },
      queryToInvalidate: ["widgets"],
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(result.current[2].isError).toBe(true);
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
