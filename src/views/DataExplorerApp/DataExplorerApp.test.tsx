/**
 * The Data Explorer canvas is the payoff target for the run_query tutorial
 * step. Completing that milestone jumps Joyride onto `explorer-canvas-tooltip`;
 * if that hook is missing, Joyride waits out the timeout as a gray overlay
 * with a center spinner.
 */
import { describe, expect, it, vi } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render } from "@/test-utils";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { ReactNode } from "react";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme" };
    },
  };
});

vi.mock("@/views/DataExplorerApp/useDataExplorerUrlSync", () => {
  return {
    useDataExplorerUrlSync: () => {
      return undefined;
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit",
  () => {
    return {
      useSyncLargeDatasetAutoLimit: () => {
        return undefined;
      },
    };
  },
);

vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", () => {
  return {
    useDataQuery: () => {
      return [
        undefined,
        false,
        { isError: false, isSuccess: false, dataUpdatedAt: 0 },
      ];
    },
  };
});

vi.mock("@/components/layouts/AppLayout/AppLayout", () => {
  return {
    AppLayout: ({
      children,
      toolbarButtonSection,
    }: {
      children: ReactNode;
      toolbarButtonSection?: ReactNode;
    }) => {
      return (
        <div>
          {toolbarButtonSection}
          {children}
        </div>
      );
    },
  };
});

vi.mock("@/components/VisualizationContainer/VisualizationContainer", () => {
  return {
    VisualizationContainer: () => {
      return null;
    },
  };
});

vi.mock("@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer", () => {
  return {
    DataExplorerDrawer: () => {
      return null;
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu",
  () => {
    return {
      DataExplorerSaveMenu: () => {
        return null;
      },
    };
  },
);

vi.mock("@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal", () => {
  return {
    OpenDatasetModal: () => {
      return null;
    },
  };
});

describe("DataExplorerApp nux canvas hook", () => {
  it("mounts the canvas tooltip hook on the chart so the answer step can land", () => {
    render(
      <AvandarAppProvider>
        <ChatPanelStateManager.Provider>
          <DataExplorerStateManager.Provider>
            <DataExplorerApp
              urlSearch={EMPTY_EXPLORER_URL_SEARCH}
              navigate={() => {
                return undefined;
              }}
            />
          </DataExplorerStateManager.Provider>
        </ChatPanelStateManager.Provider>
      </AvandarAppProvider>,
    );

    const canvas = document.querySelector('[data-nux="explorer-canvas"]');
    const tooltipHook = document.querySelector(
      '[data-nux="explorer-canvas-tooltip"]',
    );
    expect(canvas).toBeInTheDocument();
    expect(tooltipHook).toBeInTheDocument();
    expect(canvas).toContainElement(tooltipHook as HTMLElement);
  });
});
