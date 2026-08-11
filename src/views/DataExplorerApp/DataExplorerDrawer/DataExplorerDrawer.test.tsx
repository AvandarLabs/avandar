/**
 * Behavioral tests for the Data Explorer drawer: which tab body is showing,
 * how collapsing hides and restores it, and how the rail's tab-scoped controls
 * follow the active tab.
 */
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen } from "@/test-utils";
import { DataExplorerDrawer } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

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

const COLUMNS: readonly QueryResult.Column[] = [
  { name: "county", dataType: "varchar" },
  { name: "population", dataType: "bigint" },
];

const DATA: UnknownDataFrame = [
  { county: "Alameda", population: 1_600_000 },
  { county: "Fresno", population: 1_000_000 },
];

function renderDrawer(
  options: { columns?: readonly QueryResult.Column[] } = {},
): void {
  const { columns = COLUMNS } = options;
  render(
    <AvandarAppProvider>
      <DataExplorerStateManager.Provider>
        <DataExplorerDrawer
          columns={columns}
          data={DATA}
          chartRef={createRef<HTMLDivElement>()}
        />
      </DataExplorerStateManager.Provider>
    </AvandarAppProvider>,
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

    expect(screen.getByTestId("manual-query-form")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /collapse drawer/i }));

    expect(screen.getByTestId("manual-query-form")).not.toBeVisible();
    // The tab rail survives collapsing so a tab click can reopen the drawer.
    expect(getTab(/^query$/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /expand drawer/i }));

    expect(screen.getByTestId("manual-query-form")).toBeVisible();
  });

  it("expands the drawer when a tab is picked while collapsed", () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /collapse drawer/i }));
    fireEvent.click(getTab(/visualizations/i));

    expect(getTab(/visualizations/i)).toHaveAttribute("aria-selected", "true");
    // The resize separator only renders while expanded, so its return proves
    // the tab click reopened the drawer rather than just switching tabs.
    expect(
      screen.getByRole("separator", { name: /resize drawer/i }),
    ).toBeVisible();
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
