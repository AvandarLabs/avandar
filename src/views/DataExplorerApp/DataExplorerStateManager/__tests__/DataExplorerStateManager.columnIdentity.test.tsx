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
    act(() => {
      result.current[1].setOrderByColumn(revenue.id);
      result.current[1].setOrderByDirection("desc");
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

    act(() => {
      result.current[1].setColumns([
        QueryColumn.makeFromDatasetColumn({
          ...sourceColumn,
          name: "net_revenue",
        }),
      ]);
    });
    expect(result.current[0].rawSql).toContain('sum("net_revenue")');
    expect(result.current[0].rawSql).toContain(
      'order by "sum(net_revenue)" desc',
    );
    expect(result.current[0].query.orderByColumn).toBe(revenue.id);
  });

  it("does not inherit aggregation or ordering from a different source column with the same name", () => {
    const { result } = _renderStateManager();
    const revenue = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("revenue", "double"),
    );
    act(() => {
      result.current[1].setColumns([revenue]);
      result.current[1].setColumnAggregation({
        columnId: revenue.id,
        aggregation: "sum",
      });
      result.current[1].setOrderByColumn(revenue.id);
    });
    const replacement = QueryColumn.makeFromDatasetColumn({
      ...revenue.baseColumn,
      id: "dc_replacement" as DatasetColumn.Id,
    } as DatasetColumn.T);
    act(() => {
      result.current[1].setColumns([replacement]);
    });
    expect(result.current[0].query.queryColumns).toEqual([replacement]);
    expect(result.current[0].query.aggregations[replacement.id]).toBe("none");
    expect(result.current[0].query.orderByColumn).toBeUndefined();
  });

  it("retains both explicit projection IDs over one source column", () => {
    const { result } = _renderStateManager();
    const sourceColumn = _createSourceColumn("revenue", "double");
    const sumRevenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    const averageRevenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    act(() => {
      result.current[1].setColumns([sumRevenue]);
      result.current[1].setColumnAggregation({
        columnId: sumRevenue.id,
        aggregation: "sum",
      });
      result.current[1].setColumns([sumRevenue, averageRevenue]);
      result.current[1].setColumnAggregation({
        columnId: averageRevenue.id,
        aggregation: "avg",
      });
    });
    act(() => {
      result.current[1].setColumns([
        {
          ...averageRevenue,
          baseColumn: { ...sourceColumn, name: "net_revenue" },
        },
        { ...sumRevenue, baseColumn: { ...sourceColumn, name: "net_revenue" } },
      ]);
    });
    expect(
      result.current[0].query.queryColumns.map(({ id, aggregation }) => {
        return { id, aggregation };
      }),
    ).toEqual([
      { id: averageRevenue.id, aggregation: "avg" },
      { id: sumRevenue.id, aggregation: "sum" },
    ]);
    act(() => {
      result.current[1].setColumnAggregation({
        columnId: sumRevenue.id,
        aggregation: "max",
      });
    });
    expect(result.current[0].query.aggregations).toEqual({
      [averageRevenue.id]: "avg",
      [sumRevenue.id]: "max",
    });
    expect(
      result.current[0].query.queryColumns.map(({ id, aggregation }) => {
        return { id, aggregation };
      }),
    ).toEqual([
      { id: averageRevenue.id, aggregation: "avg" },
      { id: sumRevenue.id, aggregation: "max" },
    ]);
  });

  it("keeps source catalog IDs while refreshing selected metadata and ignores late catalogs", () => {
    const { result } = _renderStateManager();
    const source = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("revenue", "double"),
    );
    const dataset = Model.make("Dataset", {
      id: "sales",
      name: "sales",
    }) as Dataset.T;
    const sourceKey = Model.getTypedId(dataset);
    act(() => {
      result.current[1].setDataSource({ dataSource: dataset });
    });
    expect(result.current[0].sourceCatalog).toMatchObject({
      status: "loading",
      columns: [],
    });
    act(() => {
      result.current[1].setSourceColumns({
        sourceKey,
        status: "ready",
        columns: [source],
      });
      result.current[1].setColumns([
        QueryColumn.makeFromDatasetColumn(source.baseColumn as DatasetColumn.T),
      ]);
    });
    const selectedId = result.current[0].query.queryColumns[0]!.id;
    act(() => {
      result.current[1].setColumnAggregation({
        columnId: selectedId,
        aggregation: "sum",
      });
      result.current[1].setOrderByColumn(selectedId);
      result.current[1].setSourceColumns({
        sourceKey: { ...sourceKey },
        status: "ready",
        columns: [
          QueryColumn.makeFromDatasetColumn({
            ...source.baseColumn,
            name: "net_revenue",
          } as DatasetColumn.T),
        ],
      });
    });
    expect(result.current[0].sourceCatalog?.columns[0]?.id).toBe(source.id);
    expect(result.current[0].query.sourceColumns).toBe(
      result.current[0].sourceCatalog?.columns,
    );
    expect(result.current[0].query.queryColumns[0]).toMatchObject({
      id: selectedId,
      aggregation: "sum",
      baseColumn: { name: "net_revenue" },
    });
    expect(result.current[0].rawSql).toContain('sum("net_revenue")');
    const otherDataset = Model.make("Dataset", {
      id: "other",
      name: "other",
    }) as Dataset.T;
    act(() => {
      result.current[1].setDataSource({ dataSource: otherDataset });
      result.current[1].setSourceColumns({
        sourceKey,
        status: "ready",
        columns: [source],
      });
    });
    expect(result.current[0].sourceCatalog).toMatchObject({
      sourceKey: { id: "other" },
      status: "loading",
      columns: [],
    });
    expect(result.current[0].query.queryColumns).toEqual([]);
    expect(result.current[0].query.sourceColumns).toBeUndefined();
    act(() => {
      result.current[1].setSourceColumns({
        sourceKey: Model.getTypedId(otherDataset),
        status: "ready",
        columns: [],
      });
    });
    expect(result.current[0].sourceCatalog).toMatchObject({
      status: "ready",
      columns: [],
    });
    expect(result.current[0].query.sourceColumns).toEqual([]);
  });
});
