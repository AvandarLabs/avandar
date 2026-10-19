import { expect, it } from "vitest";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { makeResolvedVizConfigFromBoundConfig } from "$/models/vizs/makeResolvedVizConfigFromBoundConfig/makeResolvedVizConfigFromBoundConfig";
import { makeSavedBindingsFromDataVizProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeSavedBindingsFromDataVizProps/makeSavedBindingsFromDataVizProps";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { createDataVizBlock } from "@/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock";
import type { Props as DataVizProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
it("reopens a serialized styled selection against a supported renamed output", () => {
  const columns = [
    { name: "region", dataType: "varchar" as const },
    { name: "revenue", dataType: "double" as const },
  ];
  const sql = "SELECT region, revenue FROM sales";
  const schema = reconcileResultBindings({
    scopeKey: "explorer",
    sqlKey: sql,
    columns,
    projections: makeProjectionDescriptorsFromSql({ sql, columns }),
    previous: undefined,
  });
  const block = createDataVizBlock({
    rawSql: sql,
    prompt: "Sales",
    vizType: "line",
    columnBindings: schema.registry,
    vizConfig: {
      vizType: "line",
      xAxisKey: schema.columns[0]!.id,
      series: [
        {
          renderAs: "line",
          key: schema.columns[1]!.id,
          label: "Revenue trend",
          color: "#123456",
          strokeWidth: 4,
        },
      ],
      withLegend: true,
    },
  });
  const saved = JSON.parse(
    JSON.stringify({ ...DashboardConfigs.makeEmpty(), content: [block] }),
  );
  const reopened = upgradeAvaPageData(saved);
  const chart = reopened.content[0]! as {
    type: "DataViz";
    props: Extract<DataVizProps, { bindingVersion: 1 }> & { id: string };
  };
  if (chart.type !== "DataViz" || chart.props.bindingVersion !== 1) {
    throw new Error("Expected bound chart");
  }
  const renamedSql = "SELECT revenue AS amount, region FROM sales";
  const renamedColumns = [
    { name: "amount", dataType: "double" as const },
    { name: "region", dataType: "varchar" as const },
  ];
  const renamed = reconcileResultBindings({
    scopeKey: chart.props.id,
    sqlKey: renamedSql,
    columns: renamedColumns,
    projections: makeProjectionDescriptorsFromSql({
      sql: renamedSql,
      columns: renamedColumns,
    }),
    previous: chart.props.columnBindings,
  });
  const runtime = makeSavedBindingsFromDataVizProps({
    props: chart.props,
    schema: renamed,
  });
  const rendered = makeResolvedVizConfigFromBoundConfig({
    config: runtime.runtimeConfig,
    columns: renamed.columns,
  });
  expect(rendered.config).toMatchObject({
    xAxisKey: "region",
    series: [
      {
        key: "amount",
        label: "Revenue trend",
        color: "#123456",
        strokeWidth: 4,
      },
    ],
  });
  if (rendered.config.vizType !== "line") {
    throw new Error("Expected line");
  }
  const row: Record<string, unknown> = { amount: 7, region: "North" };
  expect(row[rendered.config.series[0]!.key]).toBe(7);
  expect(runtime.issues).toEqual([]);
});
