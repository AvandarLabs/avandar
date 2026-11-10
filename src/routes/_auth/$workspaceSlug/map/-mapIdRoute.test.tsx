/** Verifies that map navigation isolates stateful editor instances. */
import { Model } from "@avandar/models";
import { assertIsDefined } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { render, screen } from "@/test-utils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const { loaderDataRef } = vi.hoisted(() => {
  return {
    loaderDataRef: {
      current: undefined as
        | { avaMap: AvaMap.T; jitterSalt: string }
        | undefined,
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => {
      return (options: { component: () => JSX.Element }) => {
        return {
          options,
          useLoaderData: () => {
            return loaderDataRef.current;
          },
        };
      };
    },
    notFound: vi.fn(),
  };
});

const { getMapByIdMock, getJitterSaltMock } = vi.hoisted(() => {
  return { getMapByIdMock: vi.fn(), getJitterSaltMock: vi.fn() };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return {
    AvaMapClient: { getById: getMapByIdMock, getJitterSalt: getJitterSaltMock },
  };
});

vi.mock("@/views/GisApp/GisApp", async () => {
  const { createElement, useState } =
    await vi.importActual<typeof import("react")>("react");

  return {
    GisApp: ({
      avaMap,
      jitterSalt,
    }: {
      avaMap: AvaMap.T;
      jitterSalt: string;
    }) => {
      const [mountedMapId] = useState(avaMap.id);
      return createElement(
        "output",
        {
          "aria-label": "Mounted map identity",
          "data-jitter-salt": jitterSalt,
        },
        mountedMapId,
      );
    },
  };
});

const { Route } = await import("@/routes/_auth/$workspaceSlug/map/$mapId");

type RouteComponent = NonNullable<typeof Route.options.component>;
type RouteLoader = (context: {
  params: { mapId: string };
}) => Promise<{ avaMap: AvaMap.T; jitterSalt: string }>;

const MAP_SALT = "00000000-0000-4000-8000-0000000000aa";

/** Gets the loader declared by a route, typed for the map route's params. */
function _getRouteLoaderFromRouteOptions(options: unknown): RouteLoader {
  return (options as { loader: RouteLoader }).loader;
}

/** Gets the component declared by a route after checking the optional field. */
function _getRouteComponentFromRouteOptions(options: {
  component?: RouteComponent;
}): RouteComponent {
  assertIsDefined(
    options.component,
    "Expected the map editor route to declare a component.",
  );
  return options.component;
}

function _createAvaMap(name: string): AvaMap.T {
  return Model.make("AvaMap", {
    id: uuid<AvaMap.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    name,
    description: undefined,
    isPublic: false,
    isRestricted: false,
    slug: undefined,
    config: AvaMapConfig.makeEmpty(),
  });
}

describe("map editor route", () => {
  it("remounts the editor when the loaded map identity changes", () => {
    const firstMap = _createAvaMap("First map");
    const secondMap = _createAvaMap("Second map");
    const RouteComponent = _getRouteComponentFromRouteOptions(Route.options);
    loaderDataRef.current = { avaMap: firstMap, jitterSalt: MAP_SALT };

    const { rerender } = render(<RouteComponent />);
    expect(screen.getByRole("status")).toHaveTextContent(firstMap.id);

    loaderDataRef.current = { avaMap: secondMap, jitterSalt: MAP_SALT };
    rerender(<RouteComponent />);

    expect(screen.getByRole("status")).toHaveTextContent(secondMap.id);
  });

  it("hands the editor the map's own salt", () => {
    const avaMap = _createAvaMap("Salted map");
    const RouteComponent = _getRouteComponentFromRouteOptions(Route.options);
    loaderDataRef.current = { avaMap, jitterSalt: MAP_SALT };

    render(<RouteComponent />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "data-jitter-salt",
      MAP_SALT,
    );
  });

  it("loads the map's salt alongside the map", async () => {
    const avaMap = _createAvaMap("Salted map");
    getMapByIdMock.mockResolvedValue(avaMap);
    getJitterSaltMock.mockResolvedValue(MAP_SALT);
    const loader = _getRouteLoaderFromRouteOptions(Route.options);

    await expect(loader({ params: { mapId: avaMap.id } })).resolves.toEqual({
      avaMap,
      jitterSalt: MAP_SALT,
    });
    expect(getJitterSaltMock).toHaveBeenCalledWith({ mapId: avaMap.id });
  });

  it("gives a viewer who cannot edit the map a throwaway salt", async () => {
    const avaMap = _createAvaMap("Viewed map");
    getMapByIdMock.mockResolvedValue(avaMap);
    getJitterSaltMock.mockResolvedValue(undefined);
    const loader = _getRouteLoaderFromRouteOptions(Route.options);

    const { jitterSalt } = await loader({ params: { mapId: avaMap.id } });

    expect(jitterSalt).toMatch(/^[0-9a-f-]{36}$/);
  });
});
