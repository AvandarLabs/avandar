import type { FilterPBlockMode } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";
import type { PuckContext } from "@puckeditor/core";

import { useEffect, useRef } from "react";

import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";

function _clearTimeoutIfScheduled(timeoutId: number | undefined): void {
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
  }
}

/** Provides analytics callbacks for one dashboard filter block. */
export function useFilterPBlockAnalytics({
  filterId,
  mode,
  puck,
}: Readonly<{
  filterId: string;
  mode: FilterPBlockMode;
  puck: PuckContext;
}>): {
  logFilterChanged: (wasCleared: boolean) => void;
  scheduleContainsAnalytics: (value: string) => void;
} {
  const metadata = useAvaPageMetadata(puck);
  const containsAnalyticsTimeoutIdRef = useRef<number | undefined>(undefined);
  const logFilterChanged = (wasCleared: boolean): void => {
    if (metadata.auth !== "workspace") {
      return;
    }
    void AnalyticsClient.logEvent({
      event: "dashboard.filter_changed",
      workspaceId: metadata.workspaceId,
      app: "dashboards",
      payload: {
        dashboardId: metadata.dashboardId,
        filterId,
        mode,
        wasCleared,
      },
    });
  };
  const scheduleContainsAnalytics = (value: string): void => {
    _clearTimeoutIfScheduled(containsAnalyticsTimeoutIdRef.current);
    containsAnalyticsTimeoutIdRef.current = window.setTimeout(() => {
      logFilterChanged(value.length === 0);
      containsAnalyticsTimeoutIdRef.current = undefined;
    }, 500);
  };
  useEffect(function cancelContainsAnalyticsOnUnmount() {
    return () => {
      _clearTimeoutIfScheduled(containsAnalyticsTimeoutIdRef.current);
    };
  }, []);
  return { logFilterChanged, scheduleContainsAnalytics };
}
