import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useListPaneToggle } from "@/views/DataManagerApp/useListPaneToggle/useListPaneToggle";

const { routeState } = vi.hoisted(() => {
  return {
    routeState: {
      pathname: "/demo/data-manager/dictionaries/new",
      isTaskView: true,
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useMatchRoute: () => {
      return () => {
        return routeState.isTaskView ? {} : false;
      };
    },
    useLocation: (options: {
      select: (location: { pathname: string }) => string;
    }) => {
      return options.select({ pathname: routeState.pathname });
    },
  };
});

describe("useListPaneToggle", () => {
  beforeEach(() => {
    routeState.pathname = "/demo/data-manager/dictionaries/new";
    routeState.isTaskView = true;
  });

  it("hides the list on a task view until it is shown", () => {
    const { result } = renderHook(() => {
      return useListPaneToggle();
    });
    expect(result.current.isListShown).toBe(false);
    act(() => {
      result.current.onToggleList();
    });
    expect(result.current.isListShown).toBe(true);
  });

  it("hides the list again when the route changes", () => {
    const { result, rerender } = renderHook(() => {
      return useListPaneToggle();
    });
    act(() => {
      result.current.onToggleList();
    });
    routeState.pathname = "/other/data-manager/dictionaries/new";
    rerender();
    expect(result.current.isListShown).toBe(false);
  });

  it("always shows the list outside task views", () => {
    routeState.isTaskView = false;
    const { result } = renderHook(() => {
      return useListPaneToggle();
    });
    expect(result.current).toMatchObject({
      isTaskView: false,
      isListShown: true,
    });
  });
});
