import { I18nProvider } from "@lingui/react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapSnapshotPublishError } from "@/clients/maps/MapSnapshot/MapSnapshotPublishError";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { i18n } from "@/i18n/i18n";
import { notifyError } from "@/utils/notifications/notify";
import { usePublishDashboardMutation } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/usePublishDashboardMutation/usePublishDashboardMutation";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

const { logEventMock } = vi.hoisted(() => {
  return { logEventMock: vi.fn() };
});

let publishOnSuccess: ((updatedDashboard: Dashboard.T) => void) | undefined;
let publishOnError: ((error: Error) => void) | undefined;

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      usePublishDashboard: (options: {
        onSuccess: (updatedDashboard: Dashboard.T) => void;
        onError: (error: Error) => void;
      }) => {
        publishOnSuccess = options.onSuccess;
        publishOnError = options.onError;
        return [vi.fn(), false] as const;
      },
    },
  };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return {
    AnalyticsClient: { logEvent: logEventMock },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn(), notifySuccess: vi.fn() };
});

function makeDashboard(visibility: Dashboard.Visibility): Dashboard.T {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    workspaceId: "ws-1",
    name: "Q3 Revenue",
    slug: undefined,
    visibility,
    isPublic: visibility === "public",
    isRestricted: false,
    config: { content: [], root: {}, zones: {} },
  } as unknown as Dashboard.T;
}

function TestWrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

describe("usePublishDashboardMutation", () => {
  beforeEach(() => {
    logEventMock.mockClear();
    vi.mocked(notifyError).mockClear();
    publishOnSuccess = undefined;
    publishOnError = undefined;
  });

  it("names the map whose filters no longer apply when a publish is refused", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        return undefined;
      });
    renderHook(
      () => {
        return usePublishDashboardMutation({
          currentDashboard: makeDashboard("draft"),
          onPublished: vi.fn(),
          onShareableLimitReached: vi.fn(),
        });
      },
      { wrapper: TestWrapper },
    );

    publishOnError?.(
      new MapSnapshotPublishError({
        reason: "filtersNoLongerApply",
        mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
        mapName: "Coverage risk",
        layerNames: ["Cases"],
      }),
    );

    expect(notifyError).toHaveBeenCalledWith({
      title: "Could not publish dashboard",
      message:
        'The map "Coverage risk" has filters that no longer match its data. Open the map and fix them before publishing.',
    });
    consoleErrorSpy.mockRestore();
  });

  it("announces dashboard.published on the first publish from draft", () => {
    const listener = vi.fn();
    const unsubscribe = NuxEvents.subscribe(listener);
    const draft = makeDashboard("draft");
    const published = makeDashboard("workspace");

    renderHook(
      () => {
        return usePublishDashboardMutation({
          currentDashboard: draft,
          onPublished: vi.fn(),
          onShareableLimitReached: vi.fn(),
        });
      },
      { wrapper: TestWrapper },
    );

    publishOnSuccess?.(published);

    expect(listener).toHaveBeenCalledWith({
      name: "dashboard.published",
      payload: { dashboardId: published.id },
    });
    unsubscribe();
  });

  it("does not announce dashboard.published when republishing", () => {
    const listener = vi.fn();
    const unsubscribe = NuxEvents.subscribe(listener);
    const workspace = makeDashboard("workspace");
    const republished = { ...workspace, slug: "q3-revenue" };

    renderHook(
      () => {
        return usePublishDashboardMutation({
          currentDashboard: workspace,
          onPublished: vi.fn(),
          onShareableLimitReached: vi.fn(),
        });
      },
      { wrapper: TestWrapper },
    );

    publishOnSuccess?.(republished);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
