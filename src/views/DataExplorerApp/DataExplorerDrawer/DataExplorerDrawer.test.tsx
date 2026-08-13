/**
 * Behavioral tests for the Data Explorer drawer: that it opens shut, the two
 * ways it can be opened and which tab each lands on, and what the rail shows
 * while there is no open tab.
 *
 * Open state is read from the chevron's `aria-expanded`, located by a name that
 * matches both of its labels so the query cannot presuppose the state it is
 * checking. Computed visibility is not usable here: Mantine's `Collapse`
 * applies its expand styles inside nested `requestAnimationFrame` callbacks,
 * which a synchronous `fireEvent` never flushes.
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
// by their own tests. Stub them so these tests stay about the drawer.
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

function _renderDrawer(
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

function _getTab(name: RegExp): HTMLElement {
  return screen.getByRole("tab", { name });
}

/**
 * The chevron, found by the half of its label that both states share so the
 * lookup does not encode the open state it is used to assert.
 */
function _getToggle(): HTMLElement {
  return screen.getByRole("button", { name: /drawer$/i });
}

function _expectOpen(isOpen: boolean): void {
  expect(_getToggle()).toHaveAttribute("aria-expanded", String(isOpen));
}

describe("DataExplorerDrawer", () => {
  it("opens shut, leaving the chart the whole canvas", () => {
    _renderDrawer();

    _expectOpen(false);
    expect(
      screen.queryByRole("separator", { name: /resize drawer/i }),
    ).not.toBeInTheDocument();
    // Neither editor is mounted, so a shut drawer runs none of their queries.
    expect(screen.queryByTestId("manual-query-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sql-query-view")).not.toBeInTheDocument();
  });

  it("points the chevron at the region it reveals", () => {
    _renderDrawer();

    const regionId = _getToggle().getAttribute("aria-controls");
    expect(regionId).toBeTruthy();
    expect(document.getElementById(regionId ?? "")).toBeInTheDocument();
  });

  it("hides the tab-scoped control while shut", () => {
    _renderDrawer();

    expect(
      screen.queryByRole("radiogroup", { name: /query editor mode/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(_getToggle());

    expect(
      screen.getByRole("radiogroup", { name: /query editor mode/i }),
    ).toBeInTheDocument();
  });

  it("hides the active tab indicator while shut", () => {
    _renderDrawer();

    expect(
      screen.queryByTestId("tabs-active-indicator"),
    ).not.toBeInTheDocument();

    fireEvent.click(_getToggle());

    expect(screen.getByTestId("tabs-active-indicator")).toBeInTheDocument();
  });

  it("opens to the clicked tab when a tab label is picked", () => {
    _renderDrawer();

    fireEvent.click(_getTab(/visualizations/i));

    _expectOpen(true);
    expect(_getTab(/visualizations/i)).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("separator", { name: /resize drawer/i }),
    ).toBeInTheDocument();
  });

  it("reopens the last showing tab when the chevron is used", () => {
    _renderDrawer();

    // Open on Visualizations, then shut.
    fireEvent.click(_getTab(/visualizations/i));
    fireEvent.click(_getToggle());
    _expectOpen(false);

    fireEvent.click(_getToggle());

    _expectOpen(true);
    expect(_getTab(/visualizations/i)).toHaveAttribute("aria-selected", "true");
  });

  it("keeps one collapsible region across tab changes", () => {
    // A structural pin, not behavioral coverage: a per-panel `Collapse` would
    // remount on the tab change and skip its transition, so both ways in would
    // stop animating alike. Nothing observable in jsdom catches that.
    _renderDrawer();
    const regionId = _getToggle().getAttribute("aria-controls") ?? "";
    const regionWhileShut = document.getElementById(regionId);

    fireEvent.click(_getTab(/visualizations/i));

    expect(document.getElementById(regionId)).toBe(regionWhileShut);
    _expectOpen(true);
  });

  it("shuts again when the chevron is used", () => {
    _renderDrawer();

    fireEvent.click(_getToggle());
    _expectOpen(true);

    fireEvent.click(_getToggle());

    _expectOpen(false);
    expect(
      screen.queryByRole("separator", { name: /resize drawer/i }),
    ).not.toBeInTheDocument();
  });

  it("swaps the query editor when the rail's Manual/SQL control changes", () => {
    _renderDrawer();
    fireEvent.click(_getToggle());

    expect(screen.getByTestId("manual-query-form")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^sql$/i }));

    expect(screen.getByTestId("sql-query-view")).toBeInTheDocument();
    expect(screen.queryByTestId("manual-query-form")).not.toBeInTheDocument();
  });

  it("swaps the rail control from editor mode to chart type with the tab", () => {
    _renderDrawer();

    // Open on Query first, so the editor-mode control really is present and the
    // negative assertion below records a swap rather than the initial state.
    fireEvent.click(_getToggle());
    expect(
      screen.getByRole("radiogroup", { name: /query editor mode/i }),
    ).toBeInTheDocument();

    fireEvent.click(_getTab(/visualizations/i));

    expect(
      screen.queryByRole("radiogroup", { name: /query editor mode/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toBeInTheDocument();
  });

  it("explains that there is nothing to configure without query columns", () => {
    _renderDrawer({ columns: [] });

    fireEvent.click(_getTab(/visualizations/i));

    expect(
      screen.getByText(/run a query to configure a chart/i),
    ).toBeInTheDocument();
  });
});
