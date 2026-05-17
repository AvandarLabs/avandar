import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import type { ReactElement } from "react";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const { useListSharedWithMeMock, useCurrentWorkspaceMock } = vi.hoisted(() => {
  return {
    useListSharedWithMeMock: vi.fn(),
    useCurrentWorkspaceMock: vi.fn(),
  };
});

vi.mock("@/clients/permissions/SharedWithMeClient", () => {
  return {
    SharedWithMeClient: {
      useListSharedWithMe: useListSharedWithMeMock,
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: useCurrentWorkspaceMock,
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      return (
        <a data-testid="link" {...(rest as Record<string, never>)}>
          {children}
        </a>
      );
    },
  };
});

const { SharedWithMeView } = await import("./SharedWithMeView");

function renderWithProviders(ui: ReactElement): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AvandarUiProvider>{ui}</AvandarUiProvider>
    </QueryClientProvider>,
  );
}

const TEST_WORKSPACE = {
  id: "ws-1" as WorkspaceId,
  slug: "acme",
  name: "Acme",
} as Workspace.WithSubscription;

describe("SharedWithMeView", () => {
  it("renders the empty state when there are no shared resources", () => {
    useCurrentWorkspaceMock.mockReturnValue(TEST_WORKSPACE);
    useListSharedWithMeMock.mockReturnValue([[], false] as const);

    renderWithProviders(<SharedWithMeView />);

    expect(
      screen.getByText("Nothing has been shared with you here."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Datasets")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboards")).not.toBeInTheDocument();
  });

  it("groups datasets and dashboards into sections", () => {
    useCurrentWorkspaceMock.mockReturnValue(TEST_WORKSPACE);
    useListSharedWithMeMock.mockReturnValue([
      [
        {
          resourceType: "dataset",
          resourceId: "ds-1",
          name: "Quarterly sales",
          effectiveRole: "viewer",
        },
        {
          resourceType: "dashboard",
          resourceId: "dash-1",
          name: "Pipeline overview",
          effectiveRole: "editor",
        },
      ],
      false,
    ] as const);

    renderWithProviders(<SharedWithMeView />);

    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.getByText("Quarterly sales")).toBeInTheDocument();
    expect(screen.getByText("viewer")).toBeInTheDocument();
    expect(screen.getByText("Dashboards")).toBeInTheDocument();
    expect(screen.getByText("Pipeline overview")).toBeInTheDocument();
    expect(screen.getByText("editor")).toBeInTheDocument();
  });

  it("renders only the Datasets section when no dashboards are shared", () => {
    useCurrentWorkspaceMock.mockReturnValue(TEST_WORKSPACE);
    useListSharedWithMeMock.mockReturnValue([
      [
        {
          resourceType: "dataset",
          resourceId: "ds-1",
          name: "Only dataset",
          effectiveRole: "admin",
        },
      ],
      false,
    ] as const);

    renderWithProviders(<SharedWithMeView />);

    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.queryByText("Dashboards")).not.toBeInTheDocument();
  });
});
