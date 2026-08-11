/**
 * Behavioral tests for the Data Explorer drawer: which tab body is showing,
 * how collapsing hides and restores it, and how the rail's tab-scoped controls
 * follow the active tab.
 */
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { DataExplorerDrawer } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { fireEvent, render, screen } from "@/test-utils";
import type { UnknownDataFrame } from "@utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";

// The query editors need the router and dataset clients, and both are covered
// by their own tests. Stub them so these tests stay about the drawer: which
// panel is showing, and what collapsing does.
vi.mock(
  "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm",
  () => {
    return {
      ManualQueryForm: () => {
        return <div data-testid="manual-query-form" />;
      },
    };
  },
);

vi.mock("@/views/DataExplorerApp/SqlQueryView/SqlQueryView", () => {
  return {
    SqlQueryView: () => {
      return <div data-testid="sql-query-view" />;
    },
  };
});

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "county", dataType: "varchar" },
  { name: "population", dataType: "bigint" },
];

const DATA: UnknownDataFrame = [
  { county: "Alameda", population: 1_600_000 },
  { county: "Fresno", population: 1_000_000 },
];

function renderDrawer(
  options: { columns?: readonly QueryResultColumn[] } = {},
): void {
  const { columns = COLUMNS } = options;
  render(
    <AvandarUiProvider>
      <DataExplorerStateManager.Provider>
        <DataExplorerDrawer
          columns={columns}
          data={DATA}
          canvasRef={createRef<HTMLDivElement>()}
        />
      </DataExplorerStateManager.Provider>
    </AvandarUiProvider>,
  );
}

function getTab(name: RegExp): HTMLElement {
  return screen.getByRole("tab", { name });
}

describe("DataExplorerDrawer", () => {
  it("opens on the Query tab with the manual editor showing", () => {
    renderDrawer();

    expect(getTab(/^query$/i)).toHaveAttribute("aria-selected", "true");
    expect(getTab(/visualizations/i)).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("manual-query-form")).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /query editor mode/i }),
    ).toBeInTheDocument();
  });

  it("swaps the query editor when the rail's Manual/SQL control changes", () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("radio", { name: /^sql$/i }));

    expect(screen.getByTestId("sql-query-view")).toBeInTheDocument();
    expect(screen.queryByTestId("manual-query-form")).not.toBeInTheDocument();
  });

  it("swaps the rail control from editor mode to chart type with the tab", () => {
    renderDrawer();

    fireEvent.click(getTab(/visualizations/i));

    expect(
      screen.queryByRole("radiogroup", { name: /query editor mode/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toBeInTheDocument();
  });

  it("hides the body when collapsed and shows it again when expanded", () => {
    renderDrawer();

    const collapseButton = screen.getByRole("button", {
      name: /collapse drawer/i,
    });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapseButton);

    const expandButton = screen.getByRole("button", {
      name: /expand drawer/i,
    });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    // The tab rail survives collapsing so a tab click can reopen the drawer.
    expect(getTab(/^query$/i)).toBeInTheDocument();

    fireEvent.click(expandButton);

    expect(
      screen.getByRole("button", { name: /collapse drawer/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("expands the drawer when a tab is picked while collapsed", () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /collapse drawer/i }));
    fireEvent.click(getTab(/visualizations/i));

    expect(
      screen.getByRole("button", { name: /collapse drawer/i }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(getTab(/visualizations/i)).toHaveAttribute("aria-selected", "true");
  });

  it("hides the resize separator while collapsed", () => {
    renderDrawer();

    expect(
      screen.getByRole("separator", { name: /resize drawer/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse drawer/i }));

    expect(
      screen.queryByRole("separator", { name: /resize drawer/i }),
    ).not.toBeInTheDocument();
  });

  it("explains that there is nothing to configure without query columns", () => {
    renderDrawer({ columns: [] });

    fireEvent.click(getTab(/visualizations/i));

    expect(
      screen.getByText(/run a query to configure a chart/i),
    ).toBeInTheDocument();
  });
});
