import { renderHook } from "@testing-library/react";
import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVizDataLimit } from "@/components/VisualizationContainer/useVizDataLimit";

const { notifyWarningMock } = vi.hoisted(() => {
  return { notifyWarningMock: vi.fn() };
});

vi.mock("@ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ui")>();
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
    const data = Array.from({ length: max + 10 }, (_, index) => {
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
    const overLimitData = Array.from({ length: max + 1 }, (_, index) => {
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
    const data = Array.from({ length: 10_000 }, (_, index) => {
      return { col: index };
    });
    const { result } = renderHook(() => {
      return useVizDataLimit("table", data);
    });
    expect(result.current).toBe(data);
    expect(notifyWarningMock).not.toHaveBeenCalled();
  });
});
