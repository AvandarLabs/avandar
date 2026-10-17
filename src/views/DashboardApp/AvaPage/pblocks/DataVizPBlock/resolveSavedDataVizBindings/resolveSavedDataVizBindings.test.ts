import { describe, expect, it } from "vitest";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { resolveVizColumnBindings } from "$/models/vizs/resolveVizColumnBindings/resolveVizColumnBindings";
import { resolveSavedDataVizBindings } from "./resolveSavedDataVizBindings";
import type { DataVizBindingProps } from "./resolveSavedDataVizBindings";

const legacy: DataVizBindingProps = {
  bindingVersion: 0,
  vizConfig: {
    vizType: "line",
    xAxisKey: "REGION",
    series: [
      {
        key: "REVENUE",
        renderAs: "line",
        label: "Revenue trend",
        color: "#123456",
        strokeWidth: 4,
      },
    ],
    withLegend: true,
  },
  localFilters: [
    {
      id: "local",
      columnName: "REGION",
      label: "Region",
      mode: "select_multi",
      optionsRaw: "North,South",
      defaultValue: '["North","South"]',
    },
  ],
  globalFilterSubscription: {
    mode: "selected",
    subscribedFilterIds: ["global"],
  },
};
function schema(names: string[]) {
  return reconcileResultBindings({
    scopeKey: "chart",
    sqlKey: "SELECT * FROM sales",
    columns: names.map((name) => {
      return { name, dataType: "varchar" };
    }),
    projections: [],
    previous: undefined,
  });
}

describe("saved DataViz compatibility", () => {
  it("uses a unique case-insensitive legacy match and preserves styles and filter values", () => {
    const columns = schema(["region", "revenue"]);
    const resolved = resolveSavedDataVizBindings(legacy, columns);
    expect(resolved.issues).toEqual([]);
    expect(resolved.props).toMatchObject({
      bindingVersion: 1,
      localFilters: [
        {
          columnId: columns.columns[0]!.id,
          defaultValue: '["North","South"]',
          optionsRaw: "North,South",
        },
      ],
      globalFilterSubscription: legacy.globalFilterSubscription,
    });
    expect(
      resolveVizColumnBindings(resolved.runtimeConfig, columns.columns).config,
    ).toMatchObject({
      xAxisKey: "region",
      series: [
        {
          key: "revenue",
          label: "Revenue trend",
          color: "#123456",
          strokeWidth: 4,
        },
      ],
    });
  });

  it("retains the exact legacy envelope for ambiguous or missing required targets", () => {
    for (const names of [["region", "Region", "revenue"], ["revenue"]]) {
      const resolved = resolveSavedDataVizBindings(legacy, schema(names));
      expect(resolved.props).toBe(legacy);
      expect(resolved.runtimeConfig).toMatchObject({ xAxisKey: undefined });
      expect(resolved.issues.length).toBeGreaterThan(0);
      expect(JSON.stringify(resolved.props)).toBe(JSON.stringify(legacy));
    }
  });

  it("never rebinds a saved ID to a new same-name column", () => {
    const original = schema(["region", "revenue"]);
    const saved = resolveSavedDataVizBindings(legacy, original).props;
    const replacement = schema(["region", "revenue"]);
    const resolved = resolveSavedDataVizBindings(saved, replacement);
    expect(resolved.props.vizConfig).toEqual(saved.vizConfig);
    expect(
      resolveVizColumnBindings(resolved.runtimeConfig, replacement.columns)
        .config,
    ).toMatchObject({ xAxisKey: undefined, series: [] });
    expect(resolved.issues).toHaveLength(2);
  });
});
