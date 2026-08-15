import { Model } from "@avandar/models";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { MapListView } from "@/views/GisApp/MapListView/MapListView";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { UserId } from "$/models/User/User.types";
import type { UserProfileId } from "$/models/User/UserProfile.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  insertMock,
  navigateMock,
  permissionMock,
  useInsertOptionsMock,
  useCurrentUserProfileMock,
} = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    navigateMock: vi.fn(),
    permissionMock: vi.fn(),
    useInsertOptionsMock: vi.fn(),
    useCurrentUserProfileMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return {
        id: "00000000-0000-4000-8000-0000000000aa" as Workspace.Id,
      };
    },
  };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: useCurrentUserProfileMock,
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: permissionMock,
  };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return {
    AvaMapClient: {
      QueryKeys: {
        getAll: () => {
          return ["maps"];
        },
      },
      useInsert: (options: unknown) => {
        useInsertOptionsMock(options);
        return [insertMock, false];
      },
    },
  };
});

vi.mock("@/components/layouts/AppLayout/AppLayout", () => {
  return {
    AppLayout: ({
      children,
      title,
      toolbarButtonSection,
    }: {
      children: React.ReactNode;
      title?: string;
      toolbarButtonSection?: React.ReactNode;
    }) => {
      return (
        <main>
          <h1>{title}</h1>
          {toolbarButtonSection}
          {children}
        </main>
      );
    },
  };
});

vi.mock("@avandar/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      params: Record<string, string>;
    }) => {
      return (
        <a
          href={`/${params.workspaceSlug}/map/${params.mapId}`}
          data-route={to}
          {...props}
        >
          {children}
        </a>
      );
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

function _makeMap(overrides: Partial<AvaMap.T> = {}): AvaMap.T {
  const config = AvaMapConfig.makeEmpty();

  return Model.make("AvaMap", {
    id: "00000000-0000-4000-8000-000000000001" as AvaMap.Id,
    name: "Existing map",
    slug: undefined,
    description: undefined,
    isPublic: false,
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-0000000000bb" as UserId,
    ownerProfileId: "00000000-0000-4000-8000-0000000000cc" as UserProfileId,
    workspaceId: "00000000-0000-4000-8000-0000000000aa" as Workspace.Id,
    config,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  });
}

describe("MapListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionMock.mockReturnValue(true);
    useCurrentUserProfileMock.mockReturnValue([
      {
        userId: "00000000-0000-4000-8000-0000000000bb" as UserId,
        profileId: "00000000-0000-4000-8000-0000000000cc" as UserProfileId,
      },
      false,
    ]);
    insertMock.mockImplementation((args: { data: AvaMap.T }) => {
      const options = useInsertOptionsMock.mock.lastCall?.[0] as {
        onSuccess?: (avaMap: AvaMap.T) => void;
      };
      options.onSuccess?.(
        _makeMap({
          ...args.data,
          id: "00000000-0000-4000-8000-000000000002" as AvaMap.Id,
        }),
      );
    });
  });

  it("renders an instructive empty state and creates a map", () => {
    const { container } = render(
      <MapListView avaMaps={[]} workspaceSlug="test-workspace" />,
    );

    expect(screen.getByRole("heading", { name: "Maps" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "No maps yet" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New map" }));

    expect(insertMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Untitled map",
        workspaceId: "00000000-0000-4000-8000-0000000000aa",
        ownerId: "00000000-0000-4000-8000-0000000000bb",
        ownerProfileId: "00000000-0000-4000-8000-0000000000cc",
        config: expect.objectContaining({ layers: [] }),
      }),
    });
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/$workspaceSlug/map/$mapId",
      params: {
        workspaceSlug: "test-workspace",
        mapId: "00000000-0000-4000-8000-000000000002",
      },
    });
    expect(container).toHaveTextContent("A map plots your datasets");
  });

  it("renders one accessible link with layer metadata for each map", () => {
    const avaMap = _makeMap({
      name: "Population map",
      config: {
        ..._makeMap().config,
        layers: [MapLayer.makeEmpty("Layer 1"), MapLayer.makeEmpty("Layer 2")],
      },
    });

    render(<MapListView avaMaps={[avaMap]} workspaceSlug="test-workspace" />);

    const mapLink = screen.getByRole("link", {
      name: "Open the map Population map",
    });
    expect(mapLink).toHaveAttribute(
      "href",
      "/test-workspace/map/00000000-0000-4000-8000-000000000001",
    );
    expect(mapLink).toHaveTextContent("Population map");
    expect(mapLink).toHaveTextContent("2 layers");
  });

  it("hides map creation from a view-only user", () => {
    permissionMock.mockReturnValue(false);

    render(<MapListView avaMaps={[]} workspaceSlug="test-workspace" />);

    expect(
      screen.queryByRole("button", { name: "New map" }),
    ).not.toBeInTheDocument();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("shows and enables map creation for a map manager", () => {
    permissionMock.mockReturnValue(true);

    render(<MapListView avaMaps={[]} workspaceSlug="test-workspace" />);

    const createButton = screen.getByRole("button", { name: "New map" });
    expect(createButton).toBeEnabled();

    fireEvent.click(createButton);

    expect(insertMock).toHaveBeenCalledOnce();
  });
});
