/** Verifies that map navigation isolates stateful editor instances. */
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const { loaderDataRef } = vi.hoisted(() => {
  return {
    loaderDataRef: {
      current: undefined as { avaMap: AvaMap.T } | undefined,
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

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { getById: vi.fn() } };
});

vi.mock("@/views/GisApp/GisApp", async () => {
  const { createElement, useState } =
    await vi.importActual<typeof import("react")>("react");

  return {
    GisApp: ({ avaMap }: { avaMap: AvaMap.T }) => {
      const [mountedMapId] = useState(avaMap.id);
      return createElement(
        "output",
        { "aria-label": "Mounted map identity" },
        mountedMapId,
      );
    },
  };
});

const { Route } = await import("@/routes/_auth/$workspaceSlug/map/$mapId");

type RouteComponent = NonNullable<typeof Route.options.component>;

/** Gets the component declared by a route after checking the optional field. */
function _getRouteComponentFromRouteOptions(options: {
  component?: RouteComponent;
}): RouteComponent {
  if (!options.component) {
    throw new Error("Expected the map editor route to declare a component.");
  }

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
    loaderDataRef.current = { avaMap: firstMap };

    const { rerender } = render(<RouteComponent />);
    expect(screen.getByRole("status")).toHaveTextContent(firstMap.id);

    loaderDataRef.current = { avaMap: secondMap };
    rerender(<RouteComponent />);

    expect(screen.getByRole("status")).toHaveTextContent(secondMap.id);
  });
});
