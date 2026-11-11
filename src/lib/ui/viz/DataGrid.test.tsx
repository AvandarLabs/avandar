import { screen, waitFor } from "@testing-library/react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { describe, expect, it } from "vitest";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { DataGridColumnTitle } from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle";
import { render } from "@/test-utils";
import type { GridApi } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

describe("DataGrid", () => {
  it("renders a column title through the truncated title component", async () => {
    let gridApi: GridApi | undefined;
    render(
      <DataGrid
        columnNames={["county_of_residence"]}
        data={[{ county_of_residence: "Travis" }]}
        onGridReady={(event) => {
          gridApi = event.api;
        }}
      />,
    );

    await waitFor(() => {
      expect(gridApi).toBeDefined();
    });

    const columnDef = gridApi?.getColumn("county_of_residence")?.getColDef();
    expect(columnDef?.headerComponentParams?.innerHeaderComponent).toBe(
      DataGridColumnTitle,
    );
    expect(columnDef?.headerTooltip).toBeUndefined();
    expect(screen.getByText("county_of_residence")).toBeInTheDocument();
  });
});
