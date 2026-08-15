/** Redirect coverage for the legacy printed-QR dashboard URL. */
import { describe, expect, it, vi } from "vitest";

const { getByIdMock } = vi.hoisted(() => {
  return { getByIdMock: vi.fn() };
});

vi.mock("@/clients/dashboards/DashboardClient", () => {
  return { DashboardClient: { getById: getByIdMock } };
});

vi.mock("@/views/DashboardApp/DashboardViewerView/DashboardViewerView", () => {
  return {
    DashboardViewerView: () => {
      return null;
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager",
  () => {
    return {
      DataExplorerStateManager: {
        Provider: () => {
          return null;
        },
      },
    };
  },
);

const { Route } = await import("./$dashboardId");

type DashboardRouteLoader = (args: {
  params: { dashboardId: string; workspaceSlug: string };
}) => Promise<never>;

function _getLoader(): DashboardRouteLoader {
  if (Route.options.loader === undefined) {
    throw new Error("The legacy dashboard route must define a loader.");
  }

  return Route.options.loader as DashboardRouteLoader;
}

describe("/public/dashboards/$workspaceSlug/$dashboardId", () => {
  it("replaces the legacy URL with the canonical dashboard ID URL", async () => {
    const dashboardId = "11111111-1111-4111-8111-111111111111";
    getByIdMock.mockResolvedValue({ slug: "ignored-legacy-slug" });

    await expect(
      Promise.resolve().then(() => {
        return _getLoader()({
          params: { dashboardId, workspaceSlug: "discarded-workspace" },
        });
      }),
    ).rejects.toMatchObject({
      options: {
        params: { slugOrId: dashboardId },
        replace: true,
        to: "/d/$slugOrId",
      },
    });

    expect(getByIdMock).not.toHaveBeenCalled();
  });
});
