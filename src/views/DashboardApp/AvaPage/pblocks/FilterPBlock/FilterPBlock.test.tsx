import type { FilterPBlockMode } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";
import type { PuckContext } from "@puckeditor/core";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";
import { FilterPBlock } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

/** Exercises analytics emitted by user changes to dashboard filters. */

const { logEventMock } = vi.hoisted(() => {
  return { logEventMock: vi.fn() };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return {
    AnalyticsClient: { logEvent: logEventMock },
  };
});

const TEST_DASHBOARD_ID = "00000000-0000-4000-8000-000000000001";
const TEST_WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

type DashboardAuth = "public" | "workspace";

function _fakePuckContext(auth: DashboardAuth): PuckContext {
  return {
    renderDropZone: () => {
      return null;
    },
    metadata:
      auth === "workspace"
        ? {
            auth,
            workspaceId: TEST_WORKSPACE_ID,
            dashboardId: TEST_DASHBOARD_ID,
          }
        : {
            auth,
            dashboardId: TEST_DASHBOARD_ID,
            snapshotRevision: "00000000-0000-4000-8000-000000000003",
          },
    isEditing: true,
    dragRef: null,
  };
}

function _renderFilter(
  options: Readonly<{ mode: FilterPBlockMode; auth: DashboardAuth }>,
): ReturnType<typeof render> {
  return render(
    <DashboardFilterStateManager.Provider>
      <FilterPBlock
        puck={_fakePuckContext(options.auth)}
        filterId="region-filter"
        label="Region"
        columnName="region"
        mode={options.mode}
        optionsRaw="North,South"
        defaultValue=""
      />
    </DashboardFilterStateManager.Provider>,
  );
}

describe("FilterPBlock", () => {
  beforeEach(() => {
    logEventMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits a workspace select change immediately", () => {
    _renderFilter({ mode: "select_single", auth: "workspace" });

    fireEvent.click(screen.getByPlaceholderText("All"));
    fireEvent.click(
      screen.getByRole("option", { name: "North", hidden: true }),
    );

    expect(logEventMock).toHaveBeenCalledOnce();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "dashboard.filter_changed",
      workspaceId: TEST_WORKSPACE_ID,
      app: "dashboards",
      payload: {
        dashboardId: TEST_DASHBOARD_ID,
        filterId: "region-filter",
        mode: "select_single",
        wasCleared: false,
      },
    });
  });

  it("emits a multi-select change with its mode", () => {
    _renderFilter({ mode: "select_multi", auth: "workspace" });

    fireEvent.click(screen.getByPlaceholderText("All"));
    fireEvent.click(
      screen.getByRole("option", { name: "North", hidden: true }),
    );

    expect(logEventMock).toHaveBeenCalledOnce();
    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ mode: "select_multi" }),
      }),
    );
  });

  it("coalesces contains changes for 500 milliseconds", () => {
    vi.useFakeTimers();
    _renderFilter({ mode: "contains", auth: "workspace" });
    const input = screen.getByPlaceholderText("Contains…");

    fireEvent.change(input, { target: { value: "n" } });
    vi.advanceTimersByTime(400);
    fireEvent.change(input, { target: { value: "no" } });
    vi.advanceTimersByTime(499);
    expect(logEventMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(logEventMock).toHaveBeenCalledOnce();
    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ wasCleared: false }),
      }),
    );
  });

  it("marks an empty contains value as cleared", () => {
    vi.useFakeTimers();
    _renderFilter({ mode: "contains", auth: "workspace" });
    const input = screen.getByPlaceholderText("Contains…");

    fireEvent.change(input, { target: { value: "north" } });
    vi.advanceTimersByTime(500);
    logEventMock.mockClear();
    fireEvent.change(input, { target: { value: "" } });
    vi.advanceTimersByTime(500);

    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ wasCleared: true }),
      }),
    );
  });

  it("suppresses public dashboard analytics", () => {
    vi.useFakeTimers();
    _renderFilter({ mode: "contains", auth: "public" });
    fireEvent.change(screen.getByPlaceholderText("Contains…"), {
      target: { value: "north" },
    });
    vi.advanceTimersByTime(500);
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("cancels a pending event on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = _renderFilter({
      mode: "contains",
      auth: "workspace",
    });
    fireEvent.change(screen.getByPlaceholderText("Contains…"), {
      target: { value: "north" },
    });
    unmount();
    vi.advanceTimersByTime(500);
    expect(logEventMock).not.toHaveBeenCalled();
  });
});
