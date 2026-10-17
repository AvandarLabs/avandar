import { expect, it } from "vitest";
import { rebindProvisionalVizConfig } from "$/models/vizs/rebindProvisionalVizConfig/rebindProvisionalVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ResultBindingRegistry } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";

it("moves an owned SQL selection to a structured ID only with unique physical expression proof", () => {
  const oldId = "sql-id" as QueryColumn.Id;
  const newId = "structured-id" as QueryColumn.Id;
  const config = {
    vizType: "scatter" as const,
    series: [{ xKey: oldId, key: oldId, color: "#123456" }],
  };
  const previous: ResultBindingRegistry = {
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
  const current: ResultBindingRegistry = {
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
  expect(rebindProvisionalVizConfig(config, previous, current)).toMatchObject({
    series: [{ xKey: newId, key: newId, color: "#123456" }],
  });
  expect(
    rebindProvisionalVizConfig(config, previous, {
      ...current,
      columns: [{ ...current.columns[0]!, sqlExpressionKey: "unrelated" }],
    }),
  ).toEqual(config);
});
