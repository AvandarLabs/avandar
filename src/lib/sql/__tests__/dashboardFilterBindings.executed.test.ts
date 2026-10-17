import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { resolveDashboardFilterBindings } from "@/views/DashboardApp/DashboardFilterStateManager/resolveDashboardFilterBindings/resolveDashboardFilterBindings";
import { resolveLocalDashboardFilterBindings } from "@/views/DashboardApp/DashboardFilterStateManager/resolveLocalDashboardFilterBindings/resolveLocalDashboardFilterBindings";
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
    const initialA = resolveDashboardFilterBindings({
      filters: [GLOBAL],
      targets: {},
      columns: columnsA,
    });
    const initialB = resolveDashboardFilterBindings({
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
    const boundA = resolveDashboardFilterBindings({
      filters: [GLOBAL],
      targets: initialA.targets,
      columns: columnsA,
    });
    const boundB = resolveDashboardFilterBindings({
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
      const local = resolveLocalDashboardFilterBindings({
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
      const resolved = resolveDashboardFilterBindings({
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
        if (mode === "none") expect(resolved.targets).toEqual({});
      });
    },
  );
});
