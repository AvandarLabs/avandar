import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import { EditCaseTypeButton } from "@/views/IndividualManagerApp/EditCaseTypeButton";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

/** An honest `Concept.T`, built through `Model.make` with no cast. */
function _createConcept(): Concept.T {
  const now = new Date().toISOString();
  return Model.make("Concept", {
    id: uuid<Concept.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    name: "County",
    description: undefined,
    createdAt: now,
    updatedAt: now,
    allowManualCreation: false,
  });
}

describe("EditCaseTypeButton", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("offers Edit case type to a case_types viewer", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    render(<EditCaseTypeButton concept={_createConcept()} />);

    expect(
      screen.getByRole("button", { name: "Edit case type" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a member with no case_types role", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_records: "admin" }),
    );
    render(<EditCaseTypeButton concept={_createConcept()} />);

    expect(
      screen.queryByRole("button", { name: "Edit case type" }),
    ).not.toBeInTheDocument();
  });
});
