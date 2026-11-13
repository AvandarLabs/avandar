import { screen, waitFor } from "@testing-library/react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { describe, expect, it } from "vitest";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { ColumnCodesContext } from "@/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext";
import { DataGridColumnTitle } from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle";
import { render } from "@/test-utils";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
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

  it("puts a code-list tag on a column title that has one", async () => {
    const codes: ColumnCodes.T = {
      direction: "decode",
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      ],
      description: undefined,
      datasetColumnId: "gender-column",
      dictionaryId: "dictionary-1",
      dictionaryName: "NYS codes",
      entryName: "sex",
      codeListName: "Sex (1/2/9)",
      isOrdered: false,
      mode: "reference",
    };
    render(
      <ColumnCodesContext.Provider value={new Map([["GENDER", codes]])}>
        <DataGrid
          columnNames={["GENDER", "county"]}
          data={[{ GENDER: 1, county: "Kings" }]}
        />
      </ColumnCodesContext.Provider>,
    );

    expect(
      await screen.findByRole("button", { name: "Code list for GENDER" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Code list for county" }),
    ).toBeNull();
  });
});
