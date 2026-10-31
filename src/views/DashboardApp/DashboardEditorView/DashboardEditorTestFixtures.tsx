type Props = { children: ReactNode };
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@/test-utils";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(ui, {
    wrapper: ({ children }: Readonly<Props>) => {
      return (
        <QueryClientProvider client={queryClient}>
          <DashboardEditorStateManager.Provider>
            {children}
          </DashboardEditorStateManager.Provider>
        </QueryClientProvider>
      );
    },
    ...options,
  });
}

function _makeDashboard(): Dashboard.T {
  return {
    __type: "Dashboard",
    id: "00000000-0000-4000-8000-000000000001" as Dashboard.Id,
    name: "Test Dashboard",
    slug: "test-dashboard",
    description: undefined,
    isPublic: false,
    visibility: "draft",
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-000000000002" as User.Id,
    ownerProfileId: "00000000-0000-4000-8000-000000000003" as UserProfile.Id,
    workspaceId: "00000000-0000-4000-8000-000000000004" as Workspace.Id,
    config: {
      root: {
        props: {
          title: "Test Dashboard",
          schemaVersion: 1,
          author: "",
          containerMaxWidth: { unit: "%", value: 100 },
          horizontalPadding: "md",
          isAuthorHidden: false,
          isPublishedAtHidden: false,
          isSubtitleHidden: false,
          isTitleHidden: false,
          publishedAt: "",
          subtitle: "",
          verticalPadding: "lg",
        },
      },
      content: [],
    } as unknown as Dashboard.T["config"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Fixtures for the surrounding rendering tests. */
export const DashboardEditorTestFixtures = {
  renderWithProviders,
  _makeDashboard,
};
