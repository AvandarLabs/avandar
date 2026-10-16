/** Controlled dashboard edits retain projection and source filter identity. */
import { Model } from "@avandar/models";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { act, renderHook } from "@/test-utils";
import { useDashboardManualQueryState } from "./useDashboardManualQueryState";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const metadata = vi.hoisted(() => {
  return { datasets: [] as Dataset.T[], columns: [] as DatasetColumn.T[] };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [metadata.datasets];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [metadata.columns];
      },
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace" };
    },
  };
});

function useHarness() {
  const [rawSql, setRawSql] = useState(
    "SELECT district, SUM(cnt) AS total FROM cases GROUP BY district HAVING total > 5",
  );
  return {
    state: useDashboardManualQueryState({ rawSql, onRawSqlChange: setRawSql }),
    rawSql,
    setRawSql,
  };
}

it("retains an explicit aggregate projection and filters using the form catalog", () => {
  metadata.datasets = [
    Model.make("Dataset", { id: "cases", name: "cases" }) as Dataset.T,
  ];
  metadata.columns = ["district", "cnt"].map((name) => {
    return Model.make("DatasetColumn", {
      id: `dc_${name}`,
      datasetId: "cases",
      name,
      originalName: name,
      dataType: name === "cnt" ? "bigint" : "varchar",
    }) as DatasetColumn.T;
  });
  const { result } = renderHook(useHarness);
  const totalId = result.current.state.query.queryColumns.find((column) => {
    return column.outputAlias === "total";
  })!.id;
  act(() => {
    return result.current.state.handlers.onSetColumnAggregation({
      columnId: totalId,
      aggregation: "max",
    });
  });
  expect(result.current.rawSql).toContain('max("cnt") as "total"');
  expect(
    result.current.state.query.queryColumns.find((column) => {
      return column.outputAlias === "total";
    })?.id,
  ).toBe(totalId);
  const source = QueryColumn.makeFromDatasetColumn(metadata.columns[1]!);
  act(() => {
    return result.current.state.handlers.onSetFilters(
      {
        type: "group",
        combinator: "AND",
        rules: [
          { type: "rule", columnId: source.id, operator: ">=", value: 5 },
        ],
      },
      [
        ...(result.current.state.query.sourceColumns?.filter((column) => {
          return column.baseColumn.name !== "cnt";
        }) ?? []),
        source,
      ],
    );
  });
  expect(result.current.rawSql).toContain('where "cnt" >= 5');
  expect(result.current.state.query.filters.rules[0]).toMatchObject({
    columnId: source.id,
    value: 5,
  });
  act(() => {
    return result.current.setRawSql(
      result.current.rawSql.replaceAll('"total"', '"amount"'),
    );
  });
  expect(
    result.current.state.query.queryColumns.find((column) => {
      return column.outputAlias === "amount";
    })?.id,
  ).toBe(totalId);
  expect(result.current.state.query.filters.rules[0]).toMatchObject({
    columnId: source.id,
    value: 5,
  });
});
