import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useListPaneToggle } from "@/views/DataManagerApp/useListPaneToggle/useListPaneToggle";

const { routeState } = vi.hoisted(() => {
  return {
    routeState: {
      isPhone: false,
      pathname: "/demo/data-manager/dictionaries/new",
      isTaskView: true,
      taskRoute: "/$workspaceSlug/data-manager/dictionaries/new",
    },
  };
});

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...actual,
    useMediaQuery: () => {
      return routeState.isPhone;
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useMatchRoute: () => {
      return (options: { to: string }) => {
        return routeState.isTaskView && options.to === routeState.taskRoute
          ? {}
          : false;
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
    routeState.isPhone = false;
    routeState.taskRoute = "/$workspaceSlug/data-manager/dictionaries/new";
  });

  it("hides the list while dictionaries are applied to a dataset", () => {
    routeState.pathname = "/demo/data-manager/1/apply-dictionaries";
    routeState.taskRoute =
      "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries";
    const { result } = renderHook(() => {
      return useListPaneToggle();
    });
    expect(result.current).toMatchObject({
      isTaskView: true,
      isListShown: false,
    });
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

  it("hides the list again on returning to the route after another view", () => {
    const { result, rerender } = renderHook(() => {
      return useListPaneToggle();
    });
    act(() => {
      result.current.onToggleList();
    });
    routeState.pathname = "/demo/data-manager/datasets/1";
    routeState.isTaskView = false;
    rerender();
    routeState.pathname = "/demo/data-manager/dictionaries/new";
    routeState.isTaskView = true;
    rerender();
    expect(result.current.isListShown).toBe(false);
  });

  it("offers the toggle on a task view, but not on a phone", () => {
    const { result, rerender } = renderHook(() => {
      return useListPaneToggle();
    });
    expect(result.current.isToggleOffered).toBe(true);
    routeState.isPhone = true;
    rerender();
    expect(result.current.isToggleOffered).toBe(false);
  });
});
