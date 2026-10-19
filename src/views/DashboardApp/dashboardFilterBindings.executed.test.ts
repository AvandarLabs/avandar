import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { makeBindingsFromDashboardFilters } from "@/views/DashboardApp/DashboardFilterStateManager/makeBindingsFromDashboardFilters/makeBindingsFromDashboardFilters";
import { makeLocalFilterBindingsFromLocalFilters } from "@/views/DashboardApp/DashboardFilterStateManager/makeLocalFilterBindingsFromLocalFilters/makeLocalFilterBindingsFromLocalFilters";
import { withDuckDb } from "../../../tests/integration/queries/executedDuckDb";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

const GLOBAL: DashboardFilterRecord = {
  filterId: "region-control",
  columnName: "region",
  label: "Region",
  operator: "equals",
  value: "North",
};
const SQL_A =
  "SELECT 'North' AS region, 7 AS amount UNION ALL SELECT 'South', 3;";
const SQL_B =
  "SELECT 'North' AS territory, 70 AS amount UNION ALL SELECT 'South', 30;";
function _columns(name: string): QueryResult.BoundColumn[] {
  return [
    { id: uuid<QueryColumn.Id>(), name, dataType: "varchar" },
    { id: uuid<QueryColumn.Id>(), name: "amount", dataType: "double" },
  ];
}

describe("chart-owned dashboard filter targets", () => {
  it("returns each chart's North row after one chart changes its alias", async () => {
    const columnsA = _columns("region");
    const columnsB = _columns("region");
    const initialA = makeBindingsFromDashboardFilters({
      filters: [GLOBAL],
      targets: {},
      columns: columnsA,
    });
    const initialB = makeBindingsFromDashboardFilters({
      filters: [GLOBAL],
      targets: {},
      columns: columnsB,
    });
    // UNION lineage is opaque. Supply the reconciled metadata explicitly.
    const renamedB = columnsB.map((column) => {
      return {
        ...column,
        name: column.name === "region" ? "territory" : column.name,
      };
    });
    const boundA = makeBindingsFromDashboardFilters({
      filters: [GLOBAL],
      targets: initialA.targets,
      columns: columnsA,
    });
    const boundB = makeBindingsFromDashboardFilters({
      filters: [GLOBAL],
      targets: initialB.targets,
      columns: renamedB,
    });
    await withDuckDb(async (connection) => {
      const rowsA = await connection.runAndReadAll(
        applyDashboardFiltersToSql({
          sql: SQL_A,
          filters: boundA.resolvedFilters,
        }),
      );
      const rowsB = await connection.runAndReadAll(
        applyDashboardFiltersToSql({
          sql: SQL_B,
          filters: boundB.resolvedFilters,
        }),
      );
      expect(rowsA.getRowObjects()).toEqual([{ region: "North", amount: 7 }]);
      expect(rowsB.getRowObjects()).toEqual([
        { territory: "North", amount: 70 },
      ]);
      const local = makeLocalFilterBindingsFromLocalFilters({
        filters: [
          {
            id: "local-amount",
            columnId: columnsA[1]!.id,
            label: "Amount",
            mode: "select_single",
            optionsRaw: "",
            defaultValue: "",
          },
        ],
        valuesById: { "local-amount": "3" },
        columns: columnsA,
      });
      const localSqlA = applyDashboardFiltersToSql({
        sql: applyDashboardFiltersToSql({
          sql: SQL_A,
          filters: boundA.resolvedFilters,
        }),
        filters: local.resolvedFilters,
      });
      expect(
        (await connection.runAndReadAll(localSqlA)).getRowObjects(),
      ).toEqual([]);
      expect(
        (
          await connection.runAndReadAll(
            applyDashboardFiltersToSql({
              sql: SQL_B,
              filters: boundB.resolvedFilters,
            }),
          )
        ).getRowObjects(),
      ).toEqual([{ territory: "North", amount: 70 }]);
      expect(boundB.targets[GLOBAL.filterId]).toEqual({
        kind: "bound",
        columnId: columnsB[0]!.id,
        authoringColumnName: "region",
      });
    });
  });
  it.each(["all", "selected", "none"] as const)(
    "applies %s subscriptions before binding",
    async (mode) => {
      const filters = [GLOBAL];
      const subscribedFilterIds = DataVizFilters.resolveSubscribedFilterIds({
        subscription: { mode, subscribedFilterIds: [GLOBAL.filterId] },
        registeredFilters: filters,
      });
      const resolved = makeBindingsFromDashboardFilters({
        filters,
        targets: {},
        columns: _columns("region"),
        ...(subscribedFilterIds === undefined ? {} : { subscribedFilterIds }),
      });
      await withDuckDb(async (connection) => {
        const result = await connection.runAndReadAll(
          applyDashboardFiltersToSql({
            sql: SQL_A,
            filters: resolved.resolvedFilters,
          }),
        );
        expect(result.getRowObjects()).toEqual(
          mode === "none"
            ? [
                { region: "North", amount: 7 },
                { region: "South", amount: 3 },
              ]
            : [{ region: "North", amount: 7 }],
        );
        if (mode === "none") {
          expect(resolved.targets).toEqual({});
        }
      });
    },
  );
});

it("migrates a v4 chart and executes both saved local and global targets", async () => {
  const { upgradeAvaPageData } =
    await import("@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData");
  const { reconcileResultBindings } =
    await import("$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings");
  const { makeSavedBindingsFromDataVizProps } =
    await import("@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeSavedBindingsFromDataVizProps/makeSavedBindingsFromDataVizProps");
  const { useApplyDashboardFiltersToSql } =
    await import("@/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql");
  const rawSql =
    "SELECT * FROM (VALUES ('North', 'retail', 7), ('North', 'wholesale', 9), ('South', 'retail', 3)) AS sales(region, channel, amount)";
  const document = {
    root: { props: { schemaVersion: 4 } },
    content: [
      {
        type: "DataViz",
        props: {
          id: "saved-chart",
          nlQuery: { prompt: "Sales", rawSql, generations: [] },
          vizType: "table",
          vizConfig: { vizType: "table" },
          localFilters: [
            {
              id: "local",
              columnName: "channel",
              mode: "select_single",
              label: "Channel",
              optionsRaw: "retail,wholesale",
              defaultValue: "retail",
            },
          ],
          globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
        },
      },
    ],
  };
  const upgraded = upgradeAvaPageData(JSON.parse(JSON.stringify(document)));
  const props = upgraded.content[0]!
    .props as import("@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock").Props;
  const schema = reconcileResultBindings({
    scopeKey: "saved-chart",
    sqlKey: rawSql,
    columns: [
      { name: "region", dataType: "varchar" },
      { name: "channel", dataType: "varchar" },
      { name: "amount", dataType: "double" },
    ],
    projections: [],
    previous: undefined,
  });
  const resolved = makeSavedBindingsFromDataVizProps({
    props: props,
    schema: schema,
  });
  expect(resolved.props.bindingVersion).toBe(1);
  if (resolved.props.bindingVersion !== 1) {
    throw new Error("Legacy targets did not resolve");
  }
  const global = makeBindingsFromDashboardFilters({
    filters: [GLOBAL],
    targets: resolved.props.globalFilterTargets,
    columns: schema.columns,
  });
  const sql = useApplyDashboardFiltersToSql({
    rawSql,
    columns: schema.columns,
    globalFilters: global.resolvedFilters,
    localFilters: resolved.props.localFilters,
    localFilterState: {
      valuesById: { local: "retail" },
      setValue: () => {},
      reset: () => {},
    },
  });
  expect(sql).toBeDefined();
  await withDuckDb(async (connection) => {
    expect((await connection.runAndReadAll(sql!)).getRowObjects()).toEqual([
      { region: "North", channel: "retail", amount: 7 },
    ]);
  });
});

it("executes a valid legacy local filter despite unresolved chart and local siblings", async () => {
  const { makeRuntimeBindingsFromDataVizProps } =
    await import("@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeSavedBindingsFromDataVizProps/makeRuntimeBindingsFromDataVizProps");
  const { useApplyDashboardFiltersToSql } =
    await import("@/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql");
  const columns = _columns("region");
  const localFilter = {
    id: "local",
    columnName: "region",
    label: "Region",
    mode: "select_single" as const,
    optionsRaw: "North,South",
    defaultValue: "North",
  };
  const props = {
    bindingVersion: 0 as const,
    nlQuery: { rawSql: SQL_A, prompt: "", generations: [] },
    vizType: "line" as const,
    vizConfig: {
      vizType: "line" as const,
      xAxisKey: "region",
      series: [
        { renderAs: "line" as const, key: "missing-series", color: "#123456" },
      ],
      withLegend: true,
    },
    localFilters: [
      localFilter,
      { ...localFilter, id: "missing-local", columnName: "missing-column" },
    ],
    globalFilterSubscription: { mode: "all" as const, subscribedFilterIds: [] },
  };
  const schema = {
    issues: [],
    columns,
    registry: {
      version: 1 as const,
      scopeKey: "chart",
      sqlKey: SQL_A,
      columns,
    },
  };
  const resolved = makeRuntimeBindingsFromDataVizProps({
    props: props,
    schema: schema,
    filters: [],
  });
  expect(resolved.props).toEqual(props);
  expect(resolved.localFilters).toEqual([
    { ...localFilter, columnName: undefined, columnId: columns[0]!.id },
  ]);
  const sql = useApplyDashboardFiltersToSql({
    rawSql: SQL_A,
    columns,
    globalFilters: [],
    localFilters: resolved.localFilters,
    localFilterState: {
      valuesById: { local: "North", "missing-local": "North" },
      setValue: () => {},
      reset: () => {},
    },
  });
  await withDuckDb(async (connection) => {
    expect((await connection.runAndReadAll(sql!)).getRowObjects()).toEqual([
      { region: "North", amount: 7 },
    ]);
  });
});
