import { makeArrayWithLength } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import { useVizDataLimit } from "@/components/VisualizationContainer/useVizDataLimit/useVizDataLimit";
import { renderHook } from "@/test-utils";

const { notifyWarningMock } = vi.hoisted(() => {
  return { notifyWarningMock: vi.fn() };
});

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return {
    ...actual,
    notifyWarning: notifyWarningMock,
  };
});

describe("useVizDataLimit", () => {
  beforeEach(() => {
    notifyWarningMock.mockClear();
  });

  it("returns data unchanged when under the cap", () => {
    const data = [{ x: 1 }, { x: 2 }];
    const { result } = renderHook(() => {
      return useVizDataLimit("bar", data);
    });
    expect(result.current).toBe(data);
    expect(notifyWarningMock).not.toHaveBeenCalled();
  });

  it("slices data when over the cap", () => {
    const max = VIZ_RENDER_LIMITS.bar!.max;
    const data = makeArrayWithLength(max + 10).map((_, index) => {
      return { category: `row-${index}`, value: index };
    });
    const { result } = renderHook(() => {
      return useVizDataLimit("bar", data);
    });
    expect(result.current).toHaveLength(max);
    expect(result.current[0]).toEqual(data[0]);
    expect(result.current[max - 1]).toEqual(data[max - 1]);
  });

  it("shows a warning toast once when data first exceeds the cap", () => {
    const max = VIZ_RENDER_LIMITS.pie!.max;
    const overLimitData = makeArrayWithLength(max + 1).map((_, index) => {
      return { name: `slice-${index}`, value: index };
    });

    const { rerender } = renderHook(
      ({ rows }) => {
        return useVizDataLimit("pie", rows);
      },
      { initialProps: { rows: overLimitData } },
    );

    expect(notifyWarningMock).toHaveBeenCalledTimes(1);
    expect(notifyWarningMock).toHaveBeenCalledWith({
      title: "Pie Chart data truncated",
      message: expect.stringContaining(String(max)),
    });

    rerender({ rows: overLimitData });
    expect(notifyWarningMock).toHaveBeenCalledTimes(1);
  });

  it("does not limit table data", () => {
    const data = makeArrayWithLength(10_000).map((_, index) => {
      return { col: index };
    });
    const { result } = renderHook(() => {
      return useVizDataLimit("table", data);
    });
    expect(result.current).toBe(data);
    expect(notifyWarningMock).not.toHaveBeenCalled();
  });
});
