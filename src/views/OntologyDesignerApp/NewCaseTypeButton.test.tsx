import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import { NewCaseTypeButton } from "@/views/OntologyDesignerApp/NewCaseTypeButton";
import type { PermissionKey } from "$/models/Permissions/Permissions";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
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

describe("NewCaseTypeButton", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("offers New case type to a case_types editor", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "editor" }),
    );
    render(<NewCaseTypeButton />);

    expect(
      screen.getByRole("button", { name: "New case type" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a case_types viewer", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    render(<NewCaseTypeButton />);

    expect(
      screen.queryByRole("button", { name: "New case type" }),
    ).not.toBeInTheDocument();
  });
});
