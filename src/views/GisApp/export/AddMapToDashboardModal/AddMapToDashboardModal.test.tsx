import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { AddMapToDashboardModal } from "@/views/GisApp/export/AddMapToDashboardModal/AddMapToDashboardModal";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { UserId } from "$/models/User/User.types";
import type { UserProfileId } from "$/models/User/UserProfile.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";

const { insertMock, updateMock, useGetAllMock } = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    updateMock: vi.fn(),
    useGetAllMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return {
        id: "00000000-0000-4000-8000-0000000000aa" as Workspace.Id,
        slug: "test-ws",
      };
    },
  };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [
        {
          userId: "00000000-0000-4000-8000-0000000000bb" as UserId,
          profileId: "00000000-0000-4000-8000-0000000000cc" as UserProfileId,
        },
        false,
      ];
    },
  };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      QueryKeys: {
        getAll: () => {
          return ["dashboards"];
        },
      },
      useGetAll: (...args: unknown[]) => {
        return useGetAllMock(...args);
      },
      useInsert: () => {
        return [insertMock, false];
      },
      useUpdate: () => {
        return [updateMock, false];
      },
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return vi.fn();
    },
  };
});

type SavedPageItem = { type: string; props: { mapId?: string } };

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DASHBOARD = {
  __type: "Dashboard",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Weekly coverage",
  config: {
    root: { props: { title: "Weekly coverage" } },
    content: [{ type: "HeadingBlock", props: { id: "h-1", text: "Week 34" } }],
  },
  updatedAt: "2026-11-02T00:00:00.000Z",
  createdAt: "2026-11-01T00:00:00.000Z",
} as unknown as Dashboard.T;

function _render(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    (
      <QueryClientProvider client={queryClient}>
        <AvandarAppProvider>
          <AddMapToDashboardModal
            mapId={MAP_ID}
            workspaceSlug="test-ws"
            onClose={vi.fn()}
          />
        </AvandarAppProvider>
      </QueryClientProvider>
    ) as ReactElement,
  );
}

describe("AddMapToDashboardModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a Map block to the picked dashboard", async () => {
    useGetAllMock.mockReturnValue([[DASHBOARD], false]);
    _render();

    fireEvent.click(
      within(screen.getByRole("listbox")).getAllByRole("option")[0]!,
    );
    fireEvent.click(screen.getByRole("button", { name: /save to dashboard/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledOnce();
    });
    const { id, data } = updateMock.mock.calls[0]![0];
    const content = (data.config as { content: SavedPageItem[] }).content;
    expect(id).toBe(DASHBOARD.id);
    expect(
      content.map(({ type }) => {
        return type;
      }),
    ).toEqual(["HeadingBlock", "Map"]);
    expect(content.at(-1)).toMatchObject({ props: { mapId: MAP_ID } });
  });

  it("creates a dashboard holding the map when there are none yet", async () => {
    useGetAllMock.mockReturnValue([[], false]);
    _render();

    fireEvent.click(
      screen.getByRole("button", { name: /create dashboard & save/i }),
    );

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledOnce();
    });
    const { data } = insertMock.mock.calls[0]![0];
    const content = (data.config as { content: SavedPageItem[] }).content;
    expect(content).toHaveLength(1);
    expect(content[0]).toMatchObject({ type: "Map", props: { mapId: MAP_ID } });
  });
});
