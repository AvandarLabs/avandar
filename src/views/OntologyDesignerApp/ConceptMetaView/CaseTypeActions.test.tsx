import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import {
  fireEvent,
  makeHasPermissionFromAppRoles,
  render,
  screen,
} from "@/test-utils";
import { CaseTypeActions } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
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

vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useDelete: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getAll: () => {
          return ["Concept", "getAll"];
        },
      },
    },
  };
});

vi.mock(
  "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals",
  () => {
    return { generateIndividuals: vi.fn(), getAttributesWithMapping: vi.fn() };
  },
);

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
    defaultStatusId: uuid<ConceptStatus.Id>(),
  });
}

function _renderActionsFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): void {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const concept = _createConcept();
  const queryClient = new QueryClient();
  render(<CaseTypeActions concept={concept} fullConcept={concept} />, {
    wrapper: ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
}

describe("CaseTypeActions", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("shows Refresh records to a case_types editor", () => {
    _renderActionsFor({ case_types: "editor" });

    expect(
      screen.getByRole("button", { name: "Refresh County records" }),
    ).toBeInTheDocument();
  });

  it("shows Refresh records to a case_records editor who only views case types", () => {
    _renderActionsFor({ case_types: "viewer", case_records: "editor" });

    expect(
      screen.getByRole("button", { name: "Refresh County records" }),
    ).toBeInTheDocument();
  });

  it("hides Refresh records from a viewer of both case apps", () => {
    _renderActionsFor({ case_types: "viewer", case_records: "viewer" });

    expect(
      screen.queryByRole("button", { name: "Refresh County records" }),
    ).not.toBeInTheDocument();
  });

  it("hides the menu holding Delete case type from a case_types editor", () => {
    _renderActionsFor({ case_types: "editor" });

    expect(
      screen.queryByRole("button", { name: "More case type actions" }),
    ).not.toBeInTheDocument();
  });

  it("offers Delete case type to a case_types admin from the actions menu", async () => {
    _renderActionsFor({ case_types: "admin" });

    fireEvent.click(
      screen.getByRole("button", { name: "More case type actions" }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Delete case type" }),
    ).toBeInTheDocument();
  });

  it("hides View records from a member with no case_records role", () => {
    _renderActionsFor({ case_types: "admin" });

    expect(
      screen.queryByRole("button", { name: "View records" }),
    ).not.toBeInTheDocument();
  });

  it("shows View records to a case_records viewer", () => {
    _renderActionsFor({ case_types: "viewer", case_records: "viewer" });

    expect(
      screen.getByRole("button", { name: "View records" }),
    ).toBeInTheDocument();
  });
});
