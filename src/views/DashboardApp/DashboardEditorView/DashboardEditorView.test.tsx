import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@/test-utils";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DashboardEditorTestFixtures } from "./DashboardEditorTestFixtures";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
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

vi.mock("@puckeditor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@puckeditor/core")>();
  const { createElement, useEffect } = await import("react");

  type PuckProps = {
    data: { content: unknown[]; root: { props: Record<string, unknown> } };
    onChange: (next: PuckProps["data"]) => void;
    overrides?: { headerActions?: () => ReactElement };
  };

  function PuckMock({ data, onChange, overrides }: PuckProps): ReactElement {
    useEffect(() => {
      onChange({
        ...data,
        content: [...data.content],
        root: { ...data.root, props: { ...data.root.props } },
      });
      // Puck's load resolve fires once after mount, not on every data identity
      // change. Matching that keeps this mock from looping.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only echo
    }, []);

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

  return { ...actual, Puck: PuckMock, createUsePuck };
});

vi.mock("@/components/layouts/AppSlate/AppSlate", async () => {
  const { Fragment, createElement } = await import("react");
  return {
    AppSlate: function AppSlateMock({
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

const { saveDashboard } = vi.hoisted<{
  saveDashboard: ReturnType<typeof vi.fn>;
}>(() => {
  return { saveDashboard: vi.fn() };
});
beforeEach(() => {
  return saveDashboard.mockClear();
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      useUpdate: (config: {
        onSuccess?: () => void;
      }): [(...args: unknown[]) => void, boolean] => {
        const saveFn = (...args: unknown[]) => {
          saveDashboard(...args);
          config.onSuccess?.();
        };
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

const { renderWithProviders, _makeDashboard } = DashboardEditorTestFixtures;

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

  it("clears the unsaved-changes flag after saving the new component", async () => {
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

    await waitFor(() => {
      return expect(
        screen.getByTestId("dashboard-share-button"),
      ).toHaveAttribute("data-has-unsaved-changes", "false");
    });
  });

  it("saves the dashboard when mod+S is pressed", async () => {
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

    await waitFor(() => {
      return expect(
        screen.getByTestId("dashboard-share-button"),
      ).toHaveAttribute("data-has-unsaved-changes", "false");
    });
  });
});

function EditorRevisionProbe(): ReactNode {
  const { editorRevision } = DashboardEditorStateManager.useState();
  return <span data-testid="editor-revision">{String(editorRevision)}</span>;
}

describe("DashboardEditorView Puck remount", () => {
  it("does not remount Puck when the dashboard record is a new object with the same id", () => {
    const dashboard = _makeDashboard();
    const { rerender } = renderWithProviders(
      <>
        <EditorRevisionProbe />
        <DashboardEditorView
          dashboard={dashboard}
          workspaceSlug="test-workspace"
        />
      </>,
    );
    const revisionAfterMount =
      screen.getByTestId("editor-revision").textContent;

    rerender(
      <>
        <EditorRevisionProbe />
        <DashboardEditorView
          dashboard={{ ...dashboard }}
          workspaceSlug="test-workspace"
        />
      </>,
    );

    expect(screen.getByTestId("editor-revision")).toHaveTextContent(
      revisionAfterMount ?? "",
    );
  });
});

it("loading the same legacy chart twice neither saves nor changes its stored names", () => {
  const dashboard = _makeDashboard();
  dashboard.config = {
    root: { props: { title: "Legacy", schemaVersion: 4 } },
    content: [
      {
        type: "DataViz",
        props: {
          id: "chart",
          nlQuery: {
            prompt: "Sales",
            rawSql: "SELECT revenue FROM sales",
            generations: [],
          },
          vizType: "line",
          vizConfig: {
            vizType: "line",
            xAxisKey: "region",
            series: [{ key: "revenue", renderAs: "line", color: "#123456" }],
            withLegend: true,
          },
          localFilters: [],
          globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
        },
      },
    ],
  } as Dashboard.T["config"];
  const original = JSON.stringify(dashboard.config);
  const first = renderWithProviders(
    <DashboardEditorView dashboard={dashboard} workspaceSlug="test" />,
  );
  first.unmount();
  const second = renderWithProviders(
    <DashboardEditorView dashboard={dashboard} workspaceSlug="test" />,
  );
  expect(saveDashboard).not.toHaveBeenCalled();
  expect(JSON.stringify(dashboard.config)).toBe(original);
  second.unmount();
});
