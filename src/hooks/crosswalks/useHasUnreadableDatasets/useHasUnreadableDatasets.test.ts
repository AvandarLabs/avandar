import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHasUnreadableDatasets } from "@/hooks/crosswalks/useHasUnreadableDatasets/useHasUnreadableDatasets";
import { renderHook } from "@/test-utils";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

const mocks = vi.hoisted(() => {
  return {
    result: [undefined, true, { isError: false }] as [
      boolean | undefined,
      boolean,
      { isError: boolean },
    ],
    options: undefined as unknown,
  };
});

vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      useHasUnreadableDatasets: (options: unknown) => {
        mocks.options = options;
        return mocks.result;
      },
    },
  };
});

const CROSSWALK_ID = "crosswalk-1" as Crosswalk.Id;

function _render(crosswalkId: Crosswalk.Id | undefined) {
  return renderHook(() => {
    return useHasUnreadableDatasets(crosswalkId);
  }).result.current;
}

describe("useHasUnreadableDatasets", () => {
  beforeEach(() => {
    mocks.result = [undefined, true, { isError: false }];
    mocks.options = undefined;
  });

  it("asks about the crosswalk and is unknown while it loads", () => {
    expect(_render(CROSSWALK_ID)).toBeUndefined();
    expect(mocks.options).toMatchObject({
      crosswalkId: CROSSWALK_ID,
      useQueryOptions: { enabled: true },
    });
  });

  it("returns the answer once it is known", () => {
    mocks.result = [true, false, { isError: false }];
    expect(_render(CROSSWALK_ID)).toBe(true);
    mocks.result = [false, false, { isError: false }];
    expect(_render(CROSSWALK_ID)).toBe(false);
  });

  it("stays unknown when the lookup failed", () => {
    mocks.result = [undefined, false, { isError: true }];
    expect(_render(CROSSWALK_ID)).toBeUndefined();
  });

  it("asks nothing without a crosswalk, and has none", () => {
    expect(_render(undefined)).toBe(false);
    expect(mocks.options).toMatchObject({
      useQueryOptions: { enabled: false },
    });
  });
});
