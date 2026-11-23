/** Route-adapter coverage for where the Records home sends each role. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const { hasPermissionMock, navigateMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
    navigateMock: vi.fn(),
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Navigate: (props: unknown): ReactNode => {
      navigateMock(props);
      return null;
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

const { Route } = await import("./index");

function _renderHomeFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): void {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
}

describe("/$workspaceSlug/individual-manager/", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
    navigateMock.mockReset();
  });

  it("sends a case_types viewer to Case Manager", () => {
    _renderHomeFor({ case_types: "viewer", case_records: "viewer" });

    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a records-only user on the records home", () => {
    _renderHomeFor({ case_records: "viewer" });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Pick a case type" }),
    ).toBeInTheDocument();
  });
});
