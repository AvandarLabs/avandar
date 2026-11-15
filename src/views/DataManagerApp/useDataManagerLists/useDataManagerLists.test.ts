import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useDataManagerLists } from "@/views/DataManagerApp/useDataManagerLists/useDataManagerLists";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

const mocks = vi.hoisted(() => {
  return {
    canEditCrosswalks: true,
    crosswalkQueryArgs: undefined as
      | undefined
      | { useQueryOptions?: { enabled?: boolean } },
  };
});

const CROSSWALK = {
  id: "crosswalk-1",
  name: "Measles line lists",
} as Crosswalk.T;

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: (key: string) => {
      return key === "data_sources__can_edit_crosswalks"
        ? mocks.canEditCrosswalks
        : true;
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[], false];
      },
    },
  };
});
vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        useGetAll: () => {
          return [[], false];
        },
      },
    };
  },
);
vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      useGetAll: (args: typeof mocks.crosswalkQueryArgs) => {
        mocks.crosswalkQueryArgs = args;
        return args?.useQueryOptions?.enabled === false
          ? [undefined, false]
          : [[CROSSWALK], false];
      },
    },
  };
});

describe("useDataManagerLists", () => {
  beforeEach(() => {
    mocks.canEditCrosswalks = true;
    mocks.crosswalkQueryArgs = undefined;
  });

  it("lists the workspace's crosswalks for someone who can edit them", () => {
    const { result } = renderHook(() => {
      return useDataManagerLists();
    });

    expect(result.current.crosswalks).toEqual([CROSSWALK]);
    expect(mocks.crosswalkQueryArgs).toMatchObject({
      where: { workspace_id: { eq: "workspace-1" } },
      useQueryOptions: { enabled: true },
    });
  });

  it("does not read crosswalks for someone who cannot edit them", () => {
    mocks.canEditCrosswalks = false;
    const { result } = renderHook(() => {
      return useDataManagerLists();
    });

    expect(result.current.crosswalks).toEqual([]);
    expect(mocks.crosswalkQueryArgs?.useQueryOptions?.enabled).toBe(false);
  });
});
