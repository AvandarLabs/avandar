import { I18nProvider } from "@lingui/react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { i18n } from "@/i18n/i18n";
import { usePublishDashboardMutation } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/usePublishDashboardMutation/usePublishDashboardMutation";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

const { logEventMock } = vi.hoisted(() => {
  return { logEventMock: vi.fn() };
});

let publishOnSuccess:
  | ((updatedDashboard: Dashboard.T) => void)
  | undefined;

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      usePublishDashboard: (options: {
        onSuccess: (updatedDashboard: Dashboard.T) => void;
      }) => {
        publishOnSuccess = options.onSuccess;
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
    publishOnSuccess = undefined;
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
