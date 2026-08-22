/**
 * GisApp must sit inside AppLayout so the map uses the shared canvas Paper.
 */
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { render, screen } from "@/test-utils";
import { GisApp } from "@/views/GisApp/GisApp";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

vi.mock("@/views/GisApp/useGisApp/useGisApp", () => {
  return {
    useGisApp: () => {
      return {};
    },
  };
});

vi.mock("@/views/GisApp/GisAppMapShell", () => {
  return {
    GisAppMapShell: () => {
      return <div data-testid="gis-map-shell">Map shell</div>;
    },
  };
});

vi.mock("@/components/layouts/AppLayout/AppLayout", () => {
  return {
    AppLayout: ({ children }: { children: ReactNode }) => {
      return <main data-testid="app-layout">{children}</main>;
    },
  };
});

function _createAvaMap(): AvaMap.T {
  return Model.make("AvaMap", {
    id: uuid<AvaMap.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    name: "Untitled map",
    description: undefined,
    isPublic: false,
    isRestricted: false,
    slug: undefined,
    config: AvaMapConfig.makeEmpty(),
  });
}

describe("GisApp", () => {
  it("renders the map shell inside the shared app canvas layout", () => {
    render(<GisApp avaMap={_createAvaMap()} />);

    expect(screen.getByTestId("app-layout")).toContainElement(
      screen.getByTestId("gis-map-shell"),
    );
  });
});
