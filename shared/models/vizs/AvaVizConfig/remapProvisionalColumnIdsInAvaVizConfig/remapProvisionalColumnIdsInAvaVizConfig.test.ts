import { expect, it } from "vitest";
import { remapProvisionalColumnIdsInAvaVizConfig } from "$/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.ts";

const OLD_ID = "sql-id" as QueryColumn.Id;
const NEW_ID = "structured-id" as QueryColumn.Id;
const PREVIOUS: QueryResultColumnBindingRegistry = {
  version: 1,
  scopeKey: "explorer",
  sqlKey: "select revenue from sales",
  columns: [
    {
      id: OLD_ID,
      name: "revenue",
      dataType: "double",
      expressionKey: "physical",
      sqlExpressionKey: "physical",
    },
  ],
};
const CURRENT: QueryResultColumnBindingRegistry = {
  ...PREVIOUS,
  columns: [
    {
      ...PREVIOUS.columns[0]!,
      id: NEW_ID,
      expressionKey: "model",
      name: "amount",
    },
  ],
};

it("rebinds matching physical expressions and preserves unrelated selections", () => {
  const config = {
    vizType: "scatter" as const,
    series: [{ xKey: OLD_ID, key: OLD_ID, color: "#123456" }],
  };
  expect(
    remapProvisionalColumnIdsInAvaVizConfig({
      config: config,
      previous: PREVIOUS,
      current: CURRENT,
    }),
  ).toMatchObject({
    series: [{ xKey: NEW_ID, key: NEW_ID, color: "#123456" }],
  });
  expect(
    remapProvisionalColumnIdsInAvaVizConfig({
      config: config,
      previous: PREVIOUS,
      current: {
        ...CURRENT,
        columns: [{ ...CURRENT.columns[0]!, sqlExpressionKey: "unrelated" }],
      },
    }),
  ).toEqual(config);
});

it("rebinds a plugin chart's provisional column settings", () => {
  const config: AvaVizConfig.Plugin = {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: { date: OLD_ID, stack: undefined },
    settings: { interval: "epiWeek" },
  };
  expect(
    remapProvisionalColumnIdsInAvaVizConfig({
      config: config,
      previous: PREVIOUS,
      current: CURRENT,
    }),
  ).toEqual({ ...config, columnSettings: { date: NEW_ID, stack: undefined } });
});

it.each([undefined, null])(
  "leaves a stored plugin config whose column settings are %s as it is",
  (columnSettings) => {
    const config = {
      vizType: "plugin",
      pluginId: "avandar.epidemiology",
      pluginVizId: "epicurve",
      columnSettings,
      settings: {},
    } as unknown as AvaVizConfig.Plugin;
    expect(
      remapProvisionalColumnIdsInAvaVizConfig({
        config: config,
        previous: PREVIOUS,
        current: CURRENT,
      }),
    ).toEqual(config);
  },
);
