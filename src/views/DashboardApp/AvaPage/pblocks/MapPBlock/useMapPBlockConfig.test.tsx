import { describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useMapPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/useMapPBlockConfig";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ComponentConfig } from "@puckeditor/core";

vi.mock("@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock", () => {
  return {
    MapPBlock: () => {
      return null;
    },
  };
});
vi.mock(
  "@/views/DashboardApp/AvaPage/pfields/MapPickerPField/MapPickerPField",
  () => {
    return {
      MapPickerPField: () => {
        return null;
      },
    };
  },
);
vi.mock(
  "@/views/DashboardApp/AvaPage/pfields/MapViewPField/MapViewPField",
  () => {
    return {
      MapViewPField: () => {
        return null;
      },
    };
  },
);

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const BOOKMARK_ID =
  "00000000-0000-4000-8000-0000000000b9" as AvaMapConfig.BookmarkId;

type ResolveData = NonNullable<ComponentConfig["resolveData"]>;

function _resolveData(trigger: "load" | "replace"): unknown {
  const { result } = renderHook(
    () => {
      return useMapPBlockConfig();
    },
    { wrapper: TestProviders },
  );
  const resolveData = result.current.resolveData as unknown as ResolveData;
  const params = {
    changed: { mapId: true },
    trigger,
  } as unknown as Parameters<ResolveData>[1];
  return resolveData(
    {
      props: {
        id: "Map-1",
        mapId: MAP_ID,
        view: { type: "bookmark", bookmarkId: BOOKMARK_ID },
      },
    },
    params,
  );
}

describe("useMapPBlockConfig", () => {
  it("opens a newly picked map on its saved view", () => {
    expect(_resolveData("replace")).toEqual({
      props: { view: { type: "saved" } },
    });
  });

  it("keeps a saved block's view when the page loads", () => {
    expect(_resolveData("load")).toEqual({ props: {} });
  });
});
