/** Route-adapter coverage for how the dashboards index queries. */
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import type { ReactNode } from "react";

const { useGetAllMock, listViewMock } = vi.hoisted(() => {
  return { useGetAllMock: vi.fn(), listViewMock: vi.fn() };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return { DashboardClient: { useGetAll: useGetAllMock } };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme", name: "Acme" };
    },
  };
});

vi.mock("@/views/DashboardApp/DashboardListView/DashboardListView", () => {
  return {
    DashboardListView: (props: unknown): ReactNode => {
      listViewMock(props);
      return null;
    },
  };
});

const { Route } = await import("./index");

function _renderRouteComponent(): void {
  useGetAllMock.mockReturnValue([[], false]);
  vi.spyOn(Route, "useParams").mockReturnValue({ workspaceSlug: "acme" });
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
}

describe("/$workspaceSlug/dashboards/", () => {
  it("scopes the query to the workspace and nothing else", () => {
    // Both halves matter. Dropping `owner_id` is what lets a dashboard shared
    // with you appear at all, and keeping `workspace_id` is what stops this
    // page listing every public dashboard in the instance:
    // `util__auth_user_may_select_dashboard` returns true on `is_public`
    // before it ever looks at workspace membership, so RLS will not scope
    // this list on its own.
    _renderRouteComponent();

    expect(useGetAllMock).toHaveBeenCalledWith({
      where: { workspace_id: { eq: "workspace-1" } },
    });
    const [queryOptions] = useGetAllMock.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(queryOptions.where).not.toHaveProperty("owner_id");
  });
});
