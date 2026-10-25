import { expect, it } from "vitest";
import { remapProvisionalColumnIdsInVizConfig } from "$/models/vizs/remapProvisionalColumnIdsInVizConfig/remapProvisionalColumnIdsInVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ResultColumnBindingRegistry } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";

it("rebinds matching physical expressions and preserves unrelated selections", () => {
  const oldId = "sql-id" as QueryColumn.Id;
  const newId = "structured-id" as QueryColumn.Id;
  const config = {
    vizType: "scatter" as const,
    series: [{ xKey: oldId, key: oldId, color: "#123456" }],
  };
  const previous: ResultColumnBindingRegistry = {
    version: 1,
    scopeKey: "explorer",
    sqlKey: "select revenue from sales",
    columns: [
      {
        id: oldId,
        name: "revenue",
        dataType: "double",
        expressionKey: "physical",
        sqlExpressionKey: "physical",
      },
    ],
  };
  const current: ResultColumnBindingRegistry = {
    ...previous,
    columns: [
      {
        ...previous.columns[0]!,
        id: newId,
        expressionKey: "model",
        name: "amount",
      },
    ],
  };
  expect(
    remapProvisionalColumnIdsInVizConfig({
      config: config,
      previous: previous,
      current: current,
    }),
  ).toMatchObject({
    series: [{ xKey: newId, key: newId, color: "#123456" }],
  });
  expect(
    remapProvisionalColumnIdsInVizConfig({
      config: config,
      previous: previous,
      current: {
        ...current,
        columns: [{ ...current.columns[0]!, sqlExpressionKey: "unrelated" }],
      },
    }),
  ).toEqual(config);
});
