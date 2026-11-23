import { waitFor } from "@testing-library/react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { describe, expect, it } from "vitest";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { render } from "@/test-utils";
import type { GridApi } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

describe("DataGrid", () => {
  it("tooltips a column title only when that title is cut off", async () => {
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

    expect(gridApi?.getGridOption("tooltipShowMode")).toBe("whenTruncated");
    expect(gridApi?.getGridOption("tooltipShowDelay")).toBe(0);
  });
});
