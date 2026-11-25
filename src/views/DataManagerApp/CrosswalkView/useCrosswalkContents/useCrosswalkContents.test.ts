import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useCrosswalkContents } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkContents/useCrosswalkContents";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

type QueryState = {
  data: unknown[] | undefined;
  isFetchedAfterMount: boolean;
  fetchStatus: "fetching" | "paused" | "idle";
  isLoadingError: boolean;
};

const CROSSWALK_ID = "cccccccc-0000-4000-8000-000000000001" as Crosswalk.Id;
const CROSSWALK = {
  id: CROSSWALK_ID,
  name: "Measles line lists",
} as Crosswalk.T;

const mocks = vi.hoisted(() => {
  return {
    queries: {} as Record<string, QueryState>,
    args: {} as Record<string, unknown>,
  };
});

function _settled(data: unknown[]): QueryState {
  return {
    data,
    isFetchedAfterMount: true,
    fetchStatus: "idle",
    isLoadingError: false,
  };
}

function _mockClient(name: string) {
  return {
    useGetAll: (args: unknown) => {
      mocks.args[name] = args;
      const query = mocks.queries[name] ?? _settled([]);
      return [query.data, query.data === undefined, query];
    },
  };
}

vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return { CrosswalkClient: _mockClient("crosswalks") };
});
vi.mock("@/clients/crosswalks/CrosswalkColumnClient", () => {
  return { CrosswalkColumnClient: _mockClient("columns") };
});
vi.mock("@/clients/crosswalks/CrosswalkLayoutClient", () => {
  return { CrosswalkLayoutClient: _mockClient("layouts") };
});
vi.mock("@/clients/crosswalks/CrosswalkDatasetClient", () => {
  return { CrosswalkDatasetClient: _mockClient("datasets") };
});
vi.mock("@/clients/crosswalks/CrosswalkMappingClient", () => {
  return { CrosswalkMappingClient: _mockClient("mappings") };
});

function _render() {
  return renderHook(() => {
    return useCrosswalkContents(CROSSWALK_ID);
  }).result.current;
}

describe("useCrosswalkContents", () => {
  beforeEach(() => {
    mocks.queries = { crosswalks: _settled([CROSSWALK]) };
    mocks.args = {};
  });

  it("is ready with every table once each has fetched since mount", () => {
    const result = _render();

    expect(result.status).toBe("ready");
    expect(result.contents).toEqual({
      crosswalk: CROSSWALK,
      columns: [],
      layouts: [],
      datasets: [],
      mappings: [],
    });
    expect(mocks.args.crosswalks).toMatchObject({
      where: { id: { eq: CROSSWALK_ID } },
    });
    expect(mocks.args.mappings).toMatchObject({
      where: { crosswalk_id: { eq: CROSSWALK_ID } },
    });
  });

  it("waits while a cached table is still refetching", () => {
    mocks.queries.layouts = {
      data: [],
      isFetchedAfterMount: false,
      fetchStatus: "fetching",
      isLoadingError: false,
    };

    expect(_render()).toEqual({ status: "loading", contents: undefined });
  });

  it("uses the cache while offline", () => {
    mocks.queries.layouts = {
      data: [],
      isFetchedAfterMount: false,
      fetchStatus: "paused",
      isLoadingError: false,
    };

    expect(_render().status).toBe("ready");
  });

  it("says missing when no crosswalk has the id", () => {
    mocks.queries.crosswalks = _settled([]);

    expect(_render()).toEqual({ status: "missing", contents: undefined });
  });

  it("says failed when a table could not be read", () => {
    mocks.queries.columns = {
      data: undefined,
      isFetchedAfterMount: true,
      fetchStatus: "idle",
      isLoadingError: true,
    };

    expect(_render()).toEqual({ status: "failed", contents: undefined });
  });
});
