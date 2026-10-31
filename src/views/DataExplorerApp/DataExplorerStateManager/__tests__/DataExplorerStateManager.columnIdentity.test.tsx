import { DataExplorerIdentityTestFixtures } from "./DataExplorerIdentityTestFixtures";
import type { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";

const {
  QueryColumn,
  makeNameBoundVizConfigFromVizConfig,
  act,
  expect,
  it,
  _STYLED_BAR_CONFIG,
  _createSourceColumn,
  _renderStateManager,
} = DataExplorerIdentityTestFixtures;

it("keeps a styled series when its aggregation changes and another series survives", () => {
  const { result } = _renderStateManager();
  const quarter = QueryColumn.makeFromDatasetColumn(
    _createSourceColumn({ name: "quarter", dataType: "varchar" }),
  );
  const revenue = QueryColumn.makeFromDatasetColumn(
    _createSourceColumn({ name: "revenue", dataType: "double" }),
  );
  const profit = QueryColumn.makeFromDatasetColumn(
    _createSourceColumn({ name: "profit", dataType: "double" }),
  );
  act(() => {
    return result.current[1].setColumns([quarter, revenue, profit]);
  });
  act(() => {
    return result.current[1].setVizConfig({
      ..._STYLED_BAR_CONFIG,
      xAxisKey: quarter.id,
      series: _STYLED_BAR_CONFIG.series.map((series) => {
        return {
          ...series,
          key: series.key === "revenue" ? revenue.id : profit.id,
        };
      }),
    });
  });

  act(() => {
    return result.current[1].setColumnAggregation({
      columnId: revenue.id,
      aggregation: "sum",
    });
  });

  const nameBoundConversion = makeNameBoundVizConfigFromVizConfig({
    config: result.current[0].vizConfig,
    columns: [
      { id: quarter.id, name: "quarter", dataType: "varchar" },
      { id: revenue.id, name: "sum(revenue)", dataType: "double" },
      { id: profit.id, name: "profit", dataType: "double" },
    ],
  });
  expect(nameBoundConversion.config).toMatchObject({
    series: [
      {
        key: "sum(revenue)" as QueryColumnModel.Id,
        renderAs: "line",
        label: "Revenue trend",
        color: "#123456",
        strokeWidth: 4,
      },
      {
        key: "profit" as QueryColumnModel.Id,
        renderAs: "bar",
        label: "Profit",
        color: "#654321",
      },
    ],
  });
});

it("waits for current raw-SQL metadata before seeding a new chart type", () => {
  const { result } = _renderStateManager();
  const oldColumn = QueryColumn.makeFromDatasetColumn(
    _createSourceColumn({ name: "old", dataType: "double" }),
  );
  act(() => {
    return result.current[1].setColumns([oldColumn]);
  });
  act(() => {
    return result.current[1].setRawSql("SELECT other FROM new_source");
  });
  act(() => {
    return result.current[1].setActiveVizType("bar");
  });
  expect(result.current[0].vizConfig).toMatchObject({
    xAxisKey: undefined,
    series: [],
  });
  const currentColumns = [
    {
      id: "new-output" as QueryColumnModel.Id,
      name: "other",
      dataType: "double" as const,
    },
  ];
  act(() => {
    return result.current[1].syncVizFromQueryResult(currentColumns);
  });
  expect(result.current[0].vizConfig).toMatchObject({
    series: [{ key: currentColumns[0]!.id }],
  });
});

it("propagates scatter X-only and bubble size-only changes through the real provider", () => {
  const { result } = _renderStateManager();
  const x = "x" as QueryColumnModel.Id;
  const y = "y" as QueryColumnModel.Id;
  const size = "size" as QueryColumnModel.Id;
  const changed = "changed" as QueryColumnModel.Id;
  const columns = [x, y, size, changed].map((id) => {
    return { id, name: String(id), dataType: "double" as const };
  });
  act(() => {
    return result.current[1].setVizConfig({
      vizType: "scatter",
      series: [{ xKey: x, key: y, label: "Measured", color: "#123456" }],
    });
  });
  act(() => {
    return result.current[1].syncVizFromQueryResult(columns);
  });
  act(() => {
    return result.current[1].setVizConfig({
      vizType: "scatter",
      series: [{ xKey: changed, key: y, label: "Measured", color: "#123456" }],
    });
  });
  act(() => {
    return result.current[1].syncVizFromQueryResult(columns);
  });
  expect(
    makeNameBoundVizConfigFromVizConfig({
      config: result.current[0].vizConfig,
      columns: columns,
    }).config,
  ).toMatchObject({
    series: [
      { xKey: "changed", key: "y", label: "Measured", color: "#123456" },
    ],
  });
  act(() => {
    return result.current[1].setVizConfig({
      vizType: "bubble",
      series: [{ xKey: x, key: y, sizeKey: size, color: "#654321" }],
    });
  });
  act(() => {
    return result.current[1].syncVizFromQueryResult(columns);
  });
  act(() => {
    return result.current[1].setVizConfig({
      vizType: "bubble",
      series: [{ xKey: x, key: y, sizeKey: changed, color: "#654321" }],
    });
  });
  act(() => {
    return result.current[1].syncVizFromQueryResult(columns);
  });
  expect(
    makeNameBoundVizConfigFromVizConfig({
      config: result.current[0].vizConfig,
      columns: columns,
    }).config,
  ).toMatchObject({
    series: [{ xKey: "x", key: "y", sizeKey: "changed", color: "#654321" }],
  });
});
