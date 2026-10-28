import { describe, expect, it } from "vitest";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { makeNameBoundVizConfigFromColumnIdConfig } from "$/models/vizs/makeNameBoundVizConfigFromColumnIdConfig/makeNameBoundVizConfigFromColumnIdConfig";
import { makeSavedColumnBindingsFromDataVizProps } from "./makeSavedColumnBindingsFromDataVizProps";
import type { QueryResultColumnBindings } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { DataVizColumnBindingProps } from "./makeSavedColumnBindingsFromDataVizProps";

const legacy: DataVizColumnBindingProps = {
  columnBindingVersion: 0,
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
function _schema(names: string[]): QueryResultColumnBindings {
  return reconcileQueryResultColumnBindings({
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
    const columns = _schema(["region", "revenue"]);
    const resolved = makeSavedColumnBindingsFromDataVizProps({
      props: legacy,
      schema: columns,
    });
    expect(resolved.issues).toEqual([]);
    expect(resolved.props).toMatchObject({
      columnBindingVersion: 1,
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
      makeNameBoundVizConfigFromColumnIdConfig({
        config: resolved.runtimeConfig,
        columns: columns.columns,
      }).config,
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

  it.each([{ names: ["region", "Region", "revenue"] }, { names: ["revenue"] }])(
    "retains the exact legacy envelope for ambiguous or missing required targets: $names",
    ({ names }) => {
      const resolved = makeSavedColumnBindingsFromDataVizProps({
        props: legacy,
        schema: _schema(names),
      });
      expect(resolved.props).toBe(legacy);
      expect(resolved.runtimeConfig).toMatchObject({ xAxisKey: undefined });
      expect(resolved.issues.length).toBeGreaterThan(0);
      expect(JSON.stringify(resolved.props)).toBe(JSON.stringify(legacy));
    },
  );

  it("never rebinds a saved ID to a new same-name column", () => {
    const original = _schema(["region", "revenue"]);
    const saved = makeSavedColumnBindingsFromDataVizProps({
      props: legacy,
      schema: original,
    }).props;
    const replacement = _schema(["region", "revenue"]);
    const resolved = makeSavedColumnBindingsFromDataVizProps({
      props: saved,
      schema: replacement,
    });
    expect(resolved.props.vizConfig).toEqual(saved.vizConfig);
    expect(
      makeNameBoundVizConfigFromColumnIdConfig({
        config: resolved.runtimeConfig,
        columns: replacement.columns,
      }).config,
    ).toMatchObject({ xAxisKey: undefined, series: [] });
    expect(resolved.issues).toHaveLength(2);
  });
});
