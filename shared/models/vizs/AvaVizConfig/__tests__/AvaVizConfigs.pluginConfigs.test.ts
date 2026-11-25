import { describe, expect, it } from "vitest";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import {
  AvaVizConfigs,
  VizTypes,
} from "$/models/vizs/AvaVizConfig/AvaVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.ts";

const PLUGIN_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { date: "onset-date" as QueryColumn.Id, stack: undefined },
  settings: { interval: "epiWeek" },
};

describe("AvaVizConfigs with a plugin config", () => {
  VizTypes.forEach((targetType) => {
    it(`converts a plugin chart to the empty ${targetType} config`, () => {
      expect(AvaVizConfigs.convertVizConfig(PLUGIN_CONFIG, targetType)).toEqual(
        AvaVizConfigs.makeEmptyConfig(targetType),
      );
    });
  });

  it("returns a plugin config unchanged from hydrateFromQuery", () => {
    expect(
      AvaVizConfigs.hydrateFromQuery(
        PLUGIN_CONFIG,
        StructuredQuery.makeEmpty(),
      ),
    ).toBe(PLUGIN_CONFIG);
  });

  it("returns a plugin config unchanged from hydrateFromQueryResult", () => {
    expect(
      AvaVizConfigs.hydrateFromQueryResult(PLUGIN_CONFIG, [
        { id: "cases" as QueryColumn.Id, name: "cases", dataType: "bigint" },
      ]),
    ).toBe(PLUGIN_CONFIG);
  });
});
