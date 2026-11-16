/** Route-adapter coverage for which home controls each case_types role gets. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const {
  beginCaseDesignMock,
  caseTypeHomeMock,
  chatSessions,
  hasPermissionMock,
  startCaseDesignSessionMock,
} = vi.hoisted(() => {
  return {
    beginCaseDesignMock: vi.fn(),
    caseTypeHomeMock: vi.fn(),
    chatSessions: { isMounted: true },
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
    startCaseDesignSessionMock: vi.fn(),
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
          return { beginCaseDesign: beginCaseDesignMock };
        },
      },
    };
  },
);

vi.mock("@/components/ChatPanel/ChatSessionProvider/useChatSessions", () => {
  return {
    useChatSessions: () => {
      return chatSessions.isMounted
        ? { startCaseDesignSession: startCaseDesignSessionMock }
        : undefined;
    },
  };
});

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
  onCreate?: () => void;
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
    beginCaseDesignMock.mockReset();
    caseTypeHomeMock.mockReset();
    hasPermissionMock.mockReset();
    startCaseDesignSessionMock.mockReset();
    chatSessions.isMounted = true;
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
    expect(_renderHomeFor({ case_types: "admin" }).onDeleteCaseType).toBeTypeOf(
      "function",
    );
  });

  it("starts a case-design session from the New case type card", () => {
    _renderHomeFor({ case_types: "editor" }).onCreate?.();

    expect(startCaseDesignSessionMock).toHaveBeenCalledOnce();
    expect(beginCaseDesignMock).toHaveBeenCalledOnce();
    expect(startCaseDesignSessionMock.mock.invocationCallOrder[0]).toBeLessThan(
      beginCaseDesignMock.mock.invocationCallOrder[0]!,
    );
  });

  it("only opens case design when no chat sessions are loaded", () => {
    chatSessions.isMounted = false;
    _renderHomeFor({ case_types: "editor" }).onCreate?.();

    expect(startCaseDesignSessionMock).not.toHaveBeenCalled();
    expect(beginCaseDesignMock).toHaveBeenCalledOnce();
  });
});
