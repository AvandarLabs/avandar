import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import {
  DependentsLoadingContext,
  useDependentsLoadingTracker,
  useReportDependentsLoading,
} from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDependentsLoading/useDependentsLoading";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

const PROVINCES = "dataset-provinces" as Dataset.Id;
const DISTRICTS = "dataset-districts" as Dataset.Id;

/** Renders a tracker and, under its context, a reporter per dataset. */
function _renderTrackerWithReporters(initial: Record<string, boolean>) {
  const tracker = renderHook(() => {
    return useDependentsLoadingTracker();
  });
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => {
    return (
      <DependentsLoadingContext.Provider value={tracker.result.current.report}>
        {children}
      </DependentsLoadingContext.Provider>
    );
  };
  const reporter = renderHook(
    (loadingById: Record<string, boolean>) => {
      useReportDependentsLoading({
        datasetId: PROVINCES,
        isLoading: loadingById[PROVINCES] === true,
      });
      useReportDependentsLoading({
        datasetId: DISTRICTS,
        isLoading: loadingById[DISTRICTS] === true,
      });
    },
    { initialProps: initial, wrapper },
  );
  return { tracker, reporter };
}

describe("useDependentsLoadingTracker", () => {
  it("is not loading when no dataset reports loading", () => {
    const { tracker } = _renderTrackerWithReporters({});

    expect(tracker.result.current.isAnyLoading).toBe(false);
  });

  it("is loading while any dataset reports loading", () => {
    const { tracker } = _renderTrackerWithReporters({ [PROVINCES]: true });

    expect(tracker.result.current.isAnyLoading).toBe(true);
  });

  it("stops loading once the dataset reports it has loaded", () => {
    const { tracker, reporter } = _renderTrackerWithReporters({
      [PROVINCES]: true,
    });

    reporter.rerender({ [PROVINCES]: false });

    expect(tracker.result.current.isAnyLoading).toBe(false);
  });

  it("keeps loading while another dataset still loads", () => {
    const { tracker, reporter } = _renderTrackerWithReporters({
      [PROVINCES]: true,
      [DISTRICTS]: true,
    });

    reporter.rerender({ [PROVINCES]: false, [DISTRICTS]: true });

    expect(tracker.result.current.isAnyLoading).toBe(true);
  });

  it("stops loading when the loading dataset's row goes away", () => {
    const { tracker, reporter } = _renderTrackerWithReporters({
      [PROVINCES]: true,
    });

    act(() => {
      reporter.unmount();
    });

    expect(tracker.result.current.isAnyLoading).toBe(false);
  });
});
