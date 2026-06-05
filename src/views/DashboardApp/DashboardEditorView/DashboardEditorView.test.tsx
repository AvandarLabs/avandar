import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  RenderOptions,
  render as renderRtl,
  screen,
} from "@/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { UserId } from "$/models/User/User.types";
import type { UserProfileId } from "$/models/User/UserProfile.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";

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

const { publishDashboardMock } = vi.hoisted(() => {
  return { publishDashboardMock: vi.fn() };
});

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

vi.mock(
  "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton",
  () => {
    return {
      ShareResourceButton: () => {
        return null;
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig",
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
  "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard",
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

vi.mock("@/clients/dashboards/DashboardClient", () => {
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
      usePublishDashboard: (): [typeof publishDashboardMock, boolean] => {
        return [publishDashboardMock, false];
      },
      useDelete: (): [ReturnType<typeof vi.fn>, boolean] => {
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

vi.mock("@ui/notifications/notify", () => {
  return {
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
  };
});

vi.mock("@ui/notifications/notifyDevAlert", () => {
  return {
    notifyDevAlert: vi.fn(),
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
): ReturnType<typeof renderRtl> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderRtl(ui, {
    wrapper: ({ children }) => {
      return (
        <I18nProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <AvandarUiProvider>
              <DashboardEditorStateManager.Provider>
                {children}
              </DashboardEditorStateManager.Provider>
            </AvandarUiProvider>
          </QueryClientProvider>
        </I18nProvider>
      );
    },
    ...options,
  });
}

function _makeDashboard(): Dashboard.T {
  return {
    __type: "Dashboard",
    id: "00000000-0000-4000-8000-000000000001" as DashboardId,
    name: "Test Dashboard",
    slug: "test-dashboard",
    description: undefined,
    isPublic: false,
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-000000000002" as UserId,
    ownerProfileId: "00000000-0000-4000-8000-000000000003" as UserProfileId,
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
  beforeEach(() => {
    publishDashboardMock.mockClear();
  });

  it("disables Publish after a component is added without saving", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    // Sanity check: the dashboard starts with no components and Publish is
    // enabled (nothing to save yet).
    expect(screen.getByTestId("puck-content-count")).toHaveTextContent("0");
    expect(
      screen.getByRole("button", { name: /publish/i }),
    ).not.toHaveAttribute("aria-disabled", "true");

    // Add a random component (a HeadingBlock) via the Puck editor.
    fireEvent.click(screen.getByTestId("puck-add-component"));

    // After adding a component the dashboard has unsaved changes, so the
    // Publish button must be disabled until the user saves. We use
    // `aria-disabled` (not the HTML `disabled` attribute) so the tooltip
    // explaining the disabled state can still fire on hover.
    expect(screen.getByTestId("puck-content-count")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /publish/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("re-enables Publish after saving the new component", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByTestId("puck-add-component"));
    expect(screen.getByRole("button", { name: /publish/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      screen.getByRole("button", { name: /publish/i }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("saves the dashboard when mod+S is pressed", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByTestId("puck-add-component"));
    expect(screen.getByRole("button", { name: /publish/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.keyDown(document.documentElement, {
      key: "s",
      code: "KeyS",
      metaKey: true,
    });

    expect(
      screen.getByRole("button", { name: /publish/i }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("does not send a publish request if Publish is clicked while there are unsaved changes", () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByTestId("puck-add-component"));

    // The button uses `aria-disabled` rather than the HTML `disabled`
    // attribute (so the tooltip can render on hover), which means a click
    // event would still fire. The onClick guard must block the request.
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));

    // The confirm modal must not open and the publish mutation must not run.
    expect(
      screen.queryByRole("dialog", { name: /publish dashboard\?/i }),
    ).not.toBeInTheDocument();
    expect(publishDashboardMock).not.toHaveBeenCalled();
  });

  it("shows a tooltip explaining why Publish is disabled when there are unsaved changes", async () => {
    renderWithProviders(
      <DashboardEditorView
        dashboard={_makeDashboard()}
        workspaceSlug="test-workspace"
      />,
    );

    fireEvent.click(screen.getByTestId("puck-add-component"));

    fireEvent.mouseEnter(screen.getByRole("button", { name: /publish/i }));

    expect(
      await screen.findByText(
        /cannot publish while there are unsaved changes/i,
      ),
    ).toBeInTheDocument();
  });
});
