import { describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";
import { VizTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";

const WEEK_ID = "week-id" as QueryColumn.Id;
const CASES_ID = "cases-id" as QueryColumn.Id;

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: WEEK_ID, name: "week", dataType: "date" },
  {
    id: "district-id" as QueryColumn.Id,
    name: "district",
    dataType: "varchar",
  },
  { id: CASES_ID, name: "cases", dataType: "bigint" },
];

const LINE_CONFIG: AvaVizConfig.T = {
  vizType: "line",
  xAxisKey: WEEK_ID,
  series: [{ renderAs: "line", key: CASES_ID }],
  withLegend: true,
};

function _renderPanel(splitColumnName: string | undefined): void {
  render(
    <AvandarAppProvider>
      <VizTabPanel
        columns={COLUMNS}
        data={[]}
        vizConfig={LINE_CONFIG}
        splitColumnName={splitColumnName}
        onVizConfigChange={() => {}}
      />
    </AvandarAppProvider>,
  );
}

describe("VizTabPanel", () => {
  it("says the chart is drawn per district when it is split", () => {
    _renderPanel("district");

    expect(
      screen.getByText(/drawn as one series per district/i),
    ).toBeInTheDocument();
  });

  it("shows no split note when the chart is not split", () => {
    _renderPanel(undefined);

    expect(screen.queryByText(/drawn as one series per/i)).toBeNull();
  });
});
