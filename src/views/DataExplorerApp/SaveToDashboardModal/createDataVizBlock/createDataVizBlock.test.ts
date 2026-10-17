import { describe, expect, it } from "vitest";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { resolveVizColumnBindings } from "$/models/vizs/resolveVizColumnBindings/resolveVizColumnBindings";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { resolveSavedDataVizBindings } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveSavedDataVizBindings/resolveSavedDataVizBindings";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import {
  createDataVizBlock,
  DATA_EXPLORER_FALLBACK_PROMPT,
} from "@/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock";
import type { Props as DataVizProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";

describe("createDataVizBlock", () => {
  it("returns a DataViz block whose props mirror the input rawSql, prompt, and viz config", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("table");
    const block = createDataVizBlock({
      columnBindings: {
        version: 1,
        scopeKey: "explorer",
        sqlKey: "SELECT 1",
        columns: [],
      },
      rawSql: "SELECT 1",
      prompt: "Show one",
      vizType: "table",
      vizConfig,
    });

    expect(block.type).toBe("DataViz");
    expect(block.props.nlQuery.prompt).toBe("Show one");
    expect(block.props.nlQuery.rawSql).toBe("SELECT 1");
    expect(block.props.nlQuery.generations).toEqual([
      { prompt: "Show one", rawSql: "SELECT 1" },
    ]);
    expect(block.props.vizType).toBe("table");
    expect(block.props.vizConfig).toEqual(vizConfig);
    expect(block.props.globalFilterSubscription).toEqual({
      mode: "all",
      subscribedFilterIds: [],
    });
    expect(block.props.localFilters).toEqual([]);
    expect(block.props).toMatchObject({
      bindingVersion: 1,
      globalFilterTargets: {},
    });
    expect(block.props.columnBindings.scopeKey).toBe(block.props.id);
  });

  it("stamps a unique UUID into props.id for every call", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("table");
    const blockA = createDataVizBlock({
      columnBindings: {
        version: 1,
        scopeKey: "explorer",
        sqlKey: "SELECT 1",
        columns: [],
      },
      rawSql: "SELECT 1",
      prompt: "Show one",
      vizType: "table",
      vizConfig,
    });
    const blockB = createDataVizBlock({
      columnBindings: {
        version: 1,
        scopeKey: "explorer",
        sqlKey: "SELECT 1",
        columns: [],
      },
      rawSql: "SELECT 1",
      prompt: "Show one",
      vizType: "table",
      vizConfig,
    });

    expect(blockA.props.id).toEqual(expect.any(String));
    expect(blockA.props.id.length).toBeGreaterThan(0);
    expect(blockA.props.id).not.toBe(blockB.props.id);
  });

  it("falls back to a non-empty default prompt when prompt is undefined so the block renders", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("bar");
    const block = createDataVizBlock({
      columnBindings: {
        version: 1,
        scopeKey: "explorer",
        sqlKey: "SELECT 1",
        columns: [],
      },
      rawSql: "SELECT a, b FROM t",
      prompt: undefined,
      vizType: "bar",
      vizConfig,
    });

    expect(block.props.nlQuery.prompt).toBe(DATA_EXPLORER_FALLBACK_PROMPT);
    expect(block.props.nlQuery.generations).toEqual([
      {
        prompt: DATA_EXPLORER_FALLBACK_PROMPT,
        rawSql: "SELECT a, b FROM t",
      },
    ]);
  });

  it("falls back to the default prompt when the supplied prompt is just whitespace", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("table");
    const block = createDataVizBlock({
      columnBindings: {
        version: 1,
        scopeKey: "explorer",
        sqlKey: "SELECT 1",
        columns: [],
      },
      rawSql: "SELECT 1",
      prompt: "   ",
      vizType: "table",
      vizConfig,
    });

    expect(block.props.nlQuery.prompt).toBe(DATA_EXPLORER_FALLBACK_PROMPT);
  });
});

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
    projections: describeSqlProjections({ sql, columns }),
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
    projections: describeSqlProjections({
      sql: renamedSql,
      columns: renamedColumns,
    }),
    previous: chart.props.columnBindings,
  });
  const runtime = resolveSavedDataVizBindings(chart.props, renamed);
  const rendered = resolveVizColumnBindings(
    runtime.runtimeConfig,
    renamed.columns,
  );
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
