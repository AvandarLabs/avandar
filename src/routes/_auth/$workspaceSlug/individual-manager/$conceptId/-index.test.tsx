/** Route-adapter coverage for the empty records state's case type link. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => {
      return {
        useLoaderData: () => {
          return { id: "concept-1", name: "County" };
        },
      };
    },
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme" };
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/views/IndividualManagerApp/useConceptIndividuals", () => {
  return {
    useConceptIndividuals: () => {
      return { allIndividuals: [], isLoading: false };
    },
  };
});

const { Route } = await import("./index");

function _renderEmptyCaseTypeFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): void {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
}

describe("/$workspaceSlug/individual-manager/$conceptId/", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("offers Open case type on an empty case type to a case_types viewer", () => {
    _renderEmptyCaseTypeFor({ case_types: "viewer", case_records: "viewer" });

    expect(
      screen.getByRole("button", { name: "Open case type" }),
    ).toBeInTheDocument();
  });

  it("offers no Open case type to a member with no case_types role", () => {
    _renderEmptyCaseTypeFor({ case_records: "viewer" });

    expect(
      screen.queryByRole("button", { name: "Open case type" }),
    ).not.toBeInTheDocument();
  });
});
