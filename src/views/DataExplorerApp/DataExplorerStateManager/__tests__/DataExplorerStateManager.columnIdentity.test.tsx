/** Exercises column reconstruction and chart edits through the real store. */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { ReactNode } from "react";

const _STYLED_BAR_CONFIG: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "quarter",
  layout: "group",
  withLegend: true,
  series: [
    {
      key: "revenue",
      renderAs: "line",
      label: "Revenue trend",
      color: "#123456",
      strokeWidth: 4,
    },
    { key: "profit", renderAs: "bar", label: "Profit", color: "#654321" },
  ],
};

function _createSourceColumn(
  name: string,
  dataType: AvaDataType.T,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: `dc_${name}` as DatasetColumn.Id,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  }) as DatasetColumn.T;
}

function _Wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager() {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    {
      wrapper: _Wrapper,
    },
  );
}

describe("Data Explorer column identity", () => {
  it("keeps a styled series when its aggregation changes and another series survives", () => {
    const { result } = _renderStateManager();
    const quarter = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("quarter", "varchar"),
    );
    const revenue = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("revenue", "double"),
    );
    const profit = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("profit", "double"),
    );
    act(() => {
      return result.current[1].setColumns([quarter, revenue, profit]);
    });
    act(() => {
      return result.current[1].setVizConfig(_STYLED_BAR_CONFIG);
    });

    act(() => {
      return result.current[1].setColumnAggregation({
        columnId: revenue.id,
        aggregation: "sum",
      });
    });

    expect(result.current[0].vizConfig).toMatchObject({
      series: [
        {
          key: "sum(revenue)",
          renderAs: "line",
          label: "Revenue trend",
          color: "#123456",
          strokeWidth: 4,
        },
        { key: "profit", renderAs: "bar", label: "Profit", color: "#654321" },
      ],
    });
  });

  it("keeps aggregate SQL when selected columns are rebuilt from the same source metadata", () => {
    const { result } = _renderStateManager();
    const sourceColumn = _createSourceColumn("revenue", "double");
    const revenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    const dataset = Model.make("Dataset", {
      id: "sales",
      name: "sales",
    }) as Dataset.T;
    act(() => {
      return result.current[1].setDataSource({ dataSource: dataset });
    });
    act(() => {
      return result.current[1].setColumns([revenue]);
    });
    act(() => {
      return result.current[1].setColumnAggregation({
        columnId: revenue.id,
        aggregation: "sum",
      });
    });
    const aggregatedSql = result.current[0].rawSql;
    expect(aggregatedSql).toContain('sum("revenue")');

    // The source loader and column picker reconstruct wrappers this way.
    const refreshedRevenue = QueryColumn.makeFromDatasetColumn({
      ...sourceColumn,
    });
    act(() => {
      return result.current[1].setColumns([refreshedRevenue]);
    });

    expect(result.current[0].rawSql).toBe(aggregatedSql);
  });
});
