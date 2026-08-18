import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, RenderOptions, screen } from "@/test-utils";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return {
    useUserAppRoles: () => {
      return [
        {
          dashboards: "viewer",
          data_sources: "viewer",
          data_explorer: "viewer",
          settings: "viewer",
        },
        false,
      ] as const;
    },
  };
});

const { DashboardEditorView } =
  await import("@/views/DashboardApp/DashboardEditorView/DashboardEditorView");

vi.mock("@puckeditor/core/puck.css", () => {
  return {};
});

vi.mock("@puckeditor/core", async () => {
  const { createElement } = await import("react");

  type PuckProps = {
    data: { content: unknown[]; root: { props: Record<string, unknown> } };
    onChange: (next: PuckProps["data"]) => void;
    overrides?: { headerActions?: () => ReactElement };
  };

  function PuckMock({ data, onChange, overrides }: PuckProps): ReactElement {
    return createElement(
      "div",
      { "data-testid": "puck-mock" },
      createElement(
        "div",
        { "data-testid": "puck-header-actions" },
        overrides?.headerActions?.(),
      ),
      createElement(
        "button",
        {
          "data-testid": "puck-add-component",
          type: "button",
          onClick: () => {
            onChange({
              ...data,
              content: [
                ...data.content,
                {
                  type: "HeadingBlock",
                  props: {
                    id: "test-component-1",
                    align: "left",
                    level: 2,
                    text: "Added by test",
                  },
                },
              ],
            });
          },
        },
        "Add Component",
      ),
      createElement(
        "div",
        { "data-testid": "puck-content-count" },
        String(data.content.length),
      ),
    );
  }

  function createUsePuck<T = unknown>(): (selector?: (s: unknown) => T) => T {
    const state = { appState: { data: { content: [], root: { props: {} } } } };
    return (selector?: (s: unknown) => T): T => {
      return (selector ? selector(state) : (state as unknown as T)) as T;
    };
  }

  return { Puck: PuckMock, createUsePuck };
});

vi.mock("@/components/layouts/AppLayout/AppLayout", async () => {
  const { Fragment, createElement } = await import("react");
  return {
    AppLayout: function AppLayoutMock({
      children,
    }: {
      children: ReactElement;
    }): ReactElement {
      return createElement(Fragment, null, children);
    },
  };
});

// A probe rather than a null stub: the toolbar's only remaining job around
// publishing is handing the unsaved-changes flag to the share button, which
// forwards it to the modal's publish gate. Rendering it as an attribute lets
// the dirty-state tests below assert that hand-off without mounting the modal.
vi.mock(
  "@/views/DashboardApp/DashboardShareModal/DashboardShareButton",
  async () => {
    const { createElement } = await import("react");
    return {
      DashboardShareButton: ({
        hasUnsavedChanges,
      }: {
        hasUnsavedChanges: boolean;
      }): ReactElement => {
        return createElement("div", {
          "data-testid": "dashboard-share-button",
          "data-has-unsaved-changes": String(hasUnsavedChanges),
        });
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig",
  () => {
    return {
      useDashboardPuckConfig: (): Record<string, unknown> => {
        return {};
      },
      getDashboardTitleFromPuckData: (): string => {
        return "Test Dashboard";
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard",
  () => {
    return {
      getAvaPageMetadataFromDashboard: (): Record<string, unknown> => {
        return {};
      },
    };
  },
);

vi.mock("@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData", () => {
  return {
    upgradeAvaPageData: <T,>(data: T): T => {
      return data;
    },
  };
});

vi.mock(
  "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData",
  () => {
    return {
      getVersionFromAvaPageData: (): number => {
        return 1;
      },
    };
  },
);

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      useUpdate: (config: {
        onSuccess?: () => void;
      }): [(...args: unknown[]) => void, boolean] => {
        const saveFn = vi.fn(() => {
          config.onSuccess?.();
        });
        return [saveFn, false];
      },
      useFullDelete: (): [ReturnType<typeof vi.fn>, boolean] => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getAll: (): string[] => {
          return ["dashboards"];
        },
        getById: (): string[] => {
          return ["dashboards", "id"];
        },
      },
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

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => {
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

describe("DashboardEditorView", () => {
  // Publishing copies the PERSISTED config, so the share button must learn
  // about unsaved edits: it is what blocks the modal's publish action. These
  // three cases pin the flag's transitions; `PublishingActions` covers what the
  // modal does with it.
  it("reports unsaved changes to the share button after a component is added", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    // Sanity check: the dashboard starts with no components and nothing to
    // save yet.
    expect(screen.getByTestId("puck-content-count")).toHaveTextContent("0");
    expect(screen.getByTestId("dashboard-share-button")).toHaveAttribute(
      "data-has-unsaved-changes",
      "false",
    );

    // Add a random component (a HeadingBlock) via the Puck editor.
    fireEvent.click(screen.getByTestId("puck-add-component"));

    expect(screen.getByTestId("puck-content-count")).toHaveTextContent("1");
    expect(screen.getByTestId("dashboard-share-button")).toHaveAttribute(
      "data-has-unsaved-changes",
      "true",
    );
  });

  it("clears the unsaved-changes flag after saving the new component", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByTestId("puck-add-component"));
    expect(screen.getByTestId("dashboard-share-button")).toHaveAttribute(
      "data-has-unsaved-changes",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByTestId("dashboard-share-button")).toHaveAttribute(
      "data-has-unsaved-changes",
      "false",
    );
  });

  it("saves the dashboard when mod+S is pressed", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByTestId("puck-add-component"));
    expect(screen.getByTestId("dashboard-share-button")).toHaveAttribute(
      "data-has-unsaved-changes",
      "true",
    );

    fireEvent.keyDown(document.documentElement, {
      key: "s",
      code: "KeyS",
      metaKey: true,
    });

    expect(screen.getByTestId("dashboard-share-button")).toHaveAttribute(
      "data-has-unsaved-changes",
      "false",
    );
  });
});
