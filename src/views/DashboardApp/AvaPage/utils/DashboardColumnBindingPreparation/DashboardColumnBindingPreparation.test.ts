import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { DashboardColumnBindingPreparation } from "./DashboardColumnBindingPreparation";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaPageData } from "../../AvaPage.types";

vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return {
    runStructuredQuery: async () => {
      return {
        ...QueryResult.makeEmpty(),
        columns: [{ name: "region", dataType: "varchar" }],
      };
    },
  };
});

it("persists a newly subscribed global target on explicit save without changing viewer values", async () => {
  const id = "region-id" as QueryColumn.Id;
  const data = {
    ...DashboardConfigs.makeEmpty(),
    content: [
      {
        type: "Filter",
        props: {
          id: "filter-block",
          filterId: "filter",
          columnName: "region",
          label: "Region",
          mode: "select_single",
          defaultValue: "North",
          optionsRaw: "North,South",
        },
      },
      {
        type: "DataViz",
        props: {
          id: "chart",
          columnBindingVersion: 1,
          nlQuery: {
            prompt: "Sales",
            rawSql: "SELECT DISTINCT region FROM sales",
            generations: [],
          },
          vizType: "table",
          vizConfig: { vizType: "table" },
          columnBindings: {
            version: 1,
            scopeKey: "chart",
            sqlKey: "SELECT DISTINCT region FROM sales",
            columns: [{ id, name: "region", dataType: "varchar" }],
          },
          localFilters: [],
          globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
          globalFilterTargets: {},
        },
      },
    ],
  } as AvaPageData;
  const original = JSON.stringify(data);
  const saved = await DashboardColumnBindingPreparation.prepareDocument({
    data: data,
    auth: { auth: "workspace", workspaceId: "workspace" as Workspace.Id },
    queryClient: new QueryClient(),
  });
  expect(saved.content[1]!.props).toMatchObject({
    globalFilterTargets: {
      filter: { kind: "columnId", columnId: id, authoringColumnName: "region" },
    },
  });
  expect(saved.content[0]).toEqual(data.content[0]);
  expect(JSON.stringify(data)).toBe(original);
});
