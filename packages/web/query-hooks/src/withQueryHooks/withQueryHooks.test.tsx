import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@avandar/clients";
import { withQueryHooks } from "@query-hooks/withQueryHooks/withQueryHooks";
import type { ReactElement, ReactNode } from "react";

let queryClient: QueryClient;

function _wrapperForHook(options: { children: ReactNode }): ReactElement {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    options.children,
  );
}

/**
 * A stand-in service client built the same way real clients are, so the
 * module shape (`getClientName`, state accessors, mixins) is genuine.
 */
function _makeFakeClient() {
  const baseClient = createServiceClient("WidgetClient");
  return {
    ...baseClient,
    getAll: vi.fn(async () => {
      return ["a", "b"];
    }),
    getById: vi.fn(async (params: { id: number }) => {
      return `widget-${params.id}`;
    }),
    // a scalar-parameter query, which callers address via the `{ arg }` form
    getByName: vi.fn(async (name: string) => {
      return `widget-named-${name}`;
    }),
    insert: vi.fn(async (params: { name: string }) => {
      return { id: 1, name: params.name };
    }),
    notAFunction: "nope",
  };
}

describe("withQueryHooks", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe("hook generation", () => {
    it("generates a use-prefixed, capitalized hook for each query and mutation fn", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll", "getById"],
        mutationFns: ["insert"],
      });

      expect(client.useGetAll).toBeTypeOf("function");
      expect(client.useGetById).toBeTypeOf("function");
      expect(client.useInsert).toBeTypeOf("function");
    });

    it("preserves the original client members", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll"],
      });

      expect(client.getAll).toBeTypeOf("function");
      expect(client.getClientName()).toBe("WidgetClient");
    });

    it("skips names that are not callable on the client", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        // the types already forbid these; this guards the runtime filter that
        // backs them up, so the cast is the point of the test
        queryFns: ["notAFunction", "missingEntirely"] as unknown as ["getAll"],
      });

      expect("useNotAFunction" in client).toBe(false);
      expect("useMissingEntirely" in client).toBe(false);
    });

    it("generates no hooks when no options are given", () => {
      const client = withQueryHooks(_makeFakeClient());

      expect("useGetAll" in client).toBe(false);
      expect(client.QueryKeys).toEqual({});
    });
  });

  describe("QueryKeys builders", () => {
    it("builds a [clientName, fnName] key when there are no params", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll"],
      });

      expect(client.QueryKeys.getAll()).toEqual([
        "WidgetClient",
        "getAll",
      ]);
    });

    it("appends the params to the key when params are given", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getById"],
      });

      expect(client.QueryKeys.getById({ id: 3 })).toEqual([
        "WidgetClient",
        "getById",
        { id: 3 },
      ]);
    });

    it("treats an empty params object as no params", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getById"],
      });

      // an empty object is a runtime shape the types do not permit, so cast
      expect(
        client.QueryKeys.getById({} as unknown as { id: number }),
      ).toEqual(["WidgetClient", "getById"]);
    });

    it("strips functions out of the params so keys stay serializable", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getById"],
      });

      // callers can carry incidental callbacks in the params object; the key
      // builder must drop them so the key stays serializable
      const key = client.QueryKeys.getById({
        id: 3,
        onDone: () => {},
      } as unknown as { id: number });
      expect(key).toEqual(["WidgetClient", "getById", { id: 3 }]);
    });
  });

  describe("generated query hooks", () => {
    it("calls the underlying client fn and returns its data", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { queryFns: ["getAll"] });

      const { result } = renderHook(
        () => {
          return client.useGetAll();
        },
        { wrapper: _wrapperForHook },
      );

      await waitFor(() => {
        expect(result.current[0]).toEqual(["a", "b"]);
      });
      expect(fake.getAll).toHaveBeenCalled();
    });

    it("passes an object parameter straight through to the client fn", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { queryFns: ["getById"] });

      const { result } = renderHook(
        () => {
          return client.useGetById({ id: 9 });
        },
        { wrapper: _wrapperForHook },
      );

      await waitFor(() => {
        expect(result.current[0]).toBe("widget-9");
      });
      expect(fake.getById).toHaveBeenCalledWith({ id: 9 });
    });

    it("unwraps the singleton { arg } form for a scalar parameter", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { queryFns: ["getByName"] });

      const { result } = renderHook(
        () => {
          return client.useGetByName({ arg: "sprocket" });
        },
        { wrapper: _wrapperForHook },
      );

      await waitFor(() => {
        expect(result.current[0]).toBe("widget-named-sprocket");
      });
      // the `{ arg }` envelope is stripped, not forwarded
      expect(fake.getByName).toHaveBeenCalledWith("sprocket");
    });

    it("caches the query under the generated query key", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { queryFns: ["getAll"] });

      const { result } = renderHook(
        () => {
          return client.useGetAll();
        },
        { wrapper: _wrapperForHook },
      );

      await waitFor(() => {
        expect(result.current[0]).toEqual(["a", "b"]);
      });
      expect(queryClient.getQueryData(["WidgetClient", "getAll"])).toEqual([
        "a",
        "b",
      ]);
    });
  });

  describe("generated mutation hooks", () => {
    it("calls the underlying client fn with the mutation variables", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { mutationFns: ["insert"] });

      const { result } = renderHook(
        () => {
          return client.useInsert();
        },
        { wrapper: _wrapperForHook },
      );

      act(() => {
        result.current[0]({ name: "widget" });
      });

      await waitFor(() => {
        expect(fake.insert).toHaveBeenCalled();
      });
      expect(fake.insert.mock.calls[0]?.[0]).toEqual({ name: "widget" });
    });

    it("invalidates the getAll query key when invalidateGetAllQuery is set", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll"],
        mutationFns: ["insert"],
      });

      const { result } = renderHook(
        () => {
          return client.useInsert({ invalidateGetAllQuery: true });
        },
        { wrapper: _wrapperForHook },
      );

      act(() => {
        result.current[0]({ name: "widget" });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ["WidgetClient", "getAll"],
        });
      });
    });

    it("does not invalidate getAll when invalidateGetAllQuery is not set", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll"],
        mutationFns: ["insert"],
      });

      const { result } = renderHook(
        () => {
          return client.useInsert();
        },
        { wrapper: _wrapperForHook },
      );

      act(() => {
        result.current[0]({ name: "widget" });
      });

      await waitFor(() => {
        expect(result.current[2].isSuccess).toBe(true);
      });
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("combines invalidateGetAllQuery with an explicit queryToInvalidate", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll"],
        mutationFns: ["insert"],
      });

      const { result } = renderHook(
        () => {
          return client.useInsert({
            invalidateGetAllQuery: true,
            queryToInvalidate: ["other"],
          });
        },
        { wrapper: _wrapperForHook },
      );

      act(() => {
        result.current[0]({ name: "widget" });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["other"] });
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["WidgetClient", "getAll"],
      });
    });
  });

  describe("withCache", () => {
    it("returns the same augmented client for the same QueryClient", () => {
      const client = withQueryHooks(_makeFakeClient(), {
        queryFns: ["getAll"],
      });

      expect(client.withCache(queryClient)).toBe(client.withCache(queryClient));
    });

    it("populates the cache through withEnsureQueryData", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { queryFns: ["getAll"] });

      const data = await client
        .withCache(queryClient)
        .withEnsureQueryData()
        .getAll();

      expect(data).toEqual(["a", "b"]);
      expect(queryClient.getQueryData(["WidgetClient", "getAll"])).toEqual([
        "a",
        "b",
      ]);
    });

    it("reuses cached data on a second withEnsureQueryData call", async () => {
      const fake = _makeFakeClient();
      const client = withQueryHooks(fake, { queryFns: ["getAll"] });
      const cached = client.withCache(queryClient).withEnsureQueryData();

      await cached.getAll();
      await cached.getAll();

      // ensureQueryData serves the second call from cache
      expect(fake.getAll).toHaveBeenCalledTimes(1);
    });
  });
});
