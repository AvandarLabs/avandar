/** Route-adapter coverage for which home controls each case_types role gets. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const { caseTypeHomeMock, hasPermissionMock } = vi.hoisted(() => {
  return {
    caseTypeHomeMock: vi.fn(),
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
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
      useGetAll: () => {
        return [[], false];
      },
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
  "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager",
  () => {
    return {
      ChatPanelStateManager: {
        useDispatch: () => {
          return { beginCaseDesign: vi.fn() };
        },
      },
    };
  },
);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme", name: "Acme" };
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome", () => {
  return {
    CaseTypeHome: (props: unknown): ReactNode => {
      caseTypeHomeMock(props);
      return null;
    },
  };
});

const { Route } = await import("./index");

type CaseTypeHomeHandlers = {
  onCreate?: unknown;
  onDeleteCaseType?: unknown;
};

function _renderHomeFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): CaseTypeHomeHandlers {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
  const [props] = caseTypeHomeMock.mock.lastCall as [CaseTypeHomeHandlers];
  return props;
}

describe("/$workspaceSlug/ontology-designer/", () => {
  beforeEach(() => {
    caseTypeHomeMock.mockReset();
    hasPermissionMock.mockReset();
  });

  it("hands a case_types viewer's home no create action", () => {
    expect(_renderHomeFor({ case_types: "viewer" }).onCreate).toBeUndefined();
  });

  it("hands a case_types editor's home a create action", () => {
    expect(_renderHomeFor({ case_types: "editor" }).onCreate).toBeTypeOf(
      "function",
    );
  });

  it("hands a case_types editor's home no delete action", () => {
    expect(
      _renderHomeFor({ case_types: "editor" }).onDeleteCaseType,
    ).toBeUndefined();
  });

  it("hands a case_types admin's home a delete action", () => {
    expect(
      _renderHomeFor({ case_types: "admin" }).onDeleteCaseType,
    ).toBeTypeOf("function");
  });
});
