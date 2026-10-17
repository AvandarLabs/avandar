import { describe, expect, it } from "vitest";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";

/**
 * Registered migrations preserve legacy targets without allocating bindings.
 */
describe("AvaPage v5 bindings", () => {
  it("marks nested legacy charts unresolved while preserving their names and filter values", () => {
    const chart = {
      type: "DataViz",
      props: {
        id: "chart",
        nlQuery: {
          prompt: "Sales",
          rawSql: "SELECT revenue FROM sales",
          generations: [],
        },
        vizType: "line",
        vizConfig: {
          vizType: "line",
          xAxisKey: "region",
          series: [
            {
              renderAs: "line",
              key: "revenue",
              color: "#123456",
              label: "Revenue trend",
              strokeWidth: 4,
            },
          ],
          withLegend: true,
        },
        localFilters: [
          {
            id: "local",
            columnName: "region",
            label: "Region",
            mode: "select_single",
            optionsRaw: "North,South",
            defaultValue: "North",
          },
        ],
        globalFilterSubscription: {
          mode: "selected",
          subscribedFilterIds: ["global"],
        },
      },
    };
    const document = {
      root: { props: { schemaVersion: 4, title: "Saved" } },
      content: [
        {
          type: "Card",
          props: { id: "card", title: "Chart", content: [chart] },
        },
      ],
      zones: { "zone:content": [chart] },
    };
    const original = JSON.stringify(document);
    const upgraded = upgradeAvaPageData(document);
    expect(upgraded.root.props?.schemaVersion).toBe(5);
    expect(upgraded.content[0]?.props).toMatchObject({
      content: [{ ...chart, props: { ...chart.props, bindingVersion: 0 } }],
    });
    expect(upgraded.zones?.["zone:content"]).toEqual([
      { ...chart, props: { ...chart.props, bindingVersion: 0 } },
    ]);
    expect(JSON.stringify(document)).toBe(original);
    expect(upgradeAvaPageData(upgraded)).toEqual(upgraded);
  });
});

it("unwraps version-zero charts exactly and rejects missing persisted bound targets", async () => {
  const { AvaPageDataMigrationV5 } = await import("./AvaPageDataMigrationV5");
  const legacy = {
    root: { props: { schemaVersion: 4, title: "Saved" } },
    content: [
      {
        type: "DataViz",
        props: {
          id: "chart",
          vizType: "table",
          vizConfig: { vizType: "table" },
          nlQuery: {
            prompt: "",
            rawSql: "SELECT region FROM sales",
            generations: [],
          },
          localFilters: [],
          globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
        },
      },
    ],
  };
  const upgraded = upgradeAvaPageData(legacy);
  expect(AvaPageDataMigrationV5.downgrade(upgraded)).toEqual(legacy);
  const bound = {
    ...upgraded,
    content: [
      {
        type: "DataViz",
        props: {
          ...upgraded.content[0]!.props,
          bindingVersion: 1,
          columnBindings: {
            version: 1,
            scopeKey: "chart",
            sqlKey: "SELECT region FROM sales",
            columns: [],
          },
          globalFilterTargets: {
            global: {
              kind: "bound",
              columnId: "missing",
              authoringColumnName: "region",
            },
          },
        },
      },
    ],
  };
  expect(() => {
    return AvaPageDataMigrationV5.downgrade(bound as typeof upgraded);
  }).toThrow(/global filter.*persisted binding/i);
});

it("downgrades bound chart and local targets using only persisted names", async () => {
  const { AvaPageDataMigrationV5 } = await import("./AvaPageDataMigrationV5");
  const bound = upgradeAvaPageData({
    root: { props: { schemaVersion: 5, title: "Bound" } },
    content: [
      {
        type: "DataViz",
        props: {
          id: "chart",
          bindingVersion: 1,
          nlQuery: {
            prompt: "",
            rawSql: "SELECT region, amount FROM sales",
            generations: [],
          },
          vizType: "line",
          vizConfig: {
            vizType: "line",
            xAxisKey: "region-id",
            series: [
              {
                key: "amount-id",
                renderAs: "line",
                label: "Revenue",
                strokeWidth: 4,
                color: "#123456",
              },
            ],
            withLegend: true,
          },
          columnBindings: {
            version: 1,
            scopeKey: "chart",
            sqlKey: "SELECT region, amount FROM sales",
            columns: [
              { id: "region-id", name: "region", dataType: "varchar" },
              { id: "amount-id", name: "amount", dataType: "double" },
            ],
          },
          localFilters: [
            {
              id: "local",
              columnId: "region-id",
              label: "Region",
              mode: "select_single",
              optionsRaw: "North,South",
              defaultValue: "North",
            },
          ],
          globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
          globalFilterTargets: {
            global: {
              kind: "bound",
              columnId: "region-id",
              authoringColumnName: "region",
            },
          },
        },
      },
    ],
  });
  const downgraded = AvaPageDataMigrationV5.downgrade(bound);
  expect(downgraded.content[0]?.props).toMatchObject({
    vizConfig: {
      xAxisKey: "region",
      series: [
        { key: "amount", label: "Revenue", strokeWidth: 4, color: "#123456" },
      ],
    },
    localFilters: [{ columnName: "region", defaultValue: "North" }],
  });
  expect(downgraded.content[0]?.props).not.toHaveProperty("columnBindings");
  expect(downgraded.content[0]?.props).not.toHaveProperty("bindingVersion");
});

it.each([["territory"], ["region", "territory"]])(
  "rejects a shared global target that v4 cannot represent across %j",
  async (...names) => {
    const { AvaPageDataMigrationV5 } = await import("./AvaPageDataMigrationV5");
    const document = upgradeAvaPageData({
      root: { props: { schemaVersion: 5, title: "Shared filter" } },
      content: [
        {
          type: "Filter",
          props: {
            id: "control",
            filterId: "global",
            columnName: "region",
            label: "Region",
            mode: "select_single",
            optionsRaw: "North,South",
            defaultValue: "North",
          },
        },
        ...names.map((name, index) => {
          return {
            type: "DataViz",
            props: {
              id: `chart-${index}`,
              bindingVersion: 1,
              nlQuery: {
                prompt: "",
                rawSql: `SELECT region AS ${name} FROM sales`,
                generations: [],
              },
              vizType: "table",
              vizConfig: { vizType: "table" },
              localFilters: [],
              globalFilterSubscription: {
                mode: "all",
                subscribedFilterIds: [],
              },
              columnBindings: {
                version: 1,
                scopeKey: `chart-${index}`,
                sqlKey: `SELECT region AS ${name} FROM sales`,
                columns: [{ id: `column-${index}`, name, dataType: "varchar" }],
              },
              globalFilterTargets: {
                global: {
                  kind: "bound",
                  columnId: `column-${index}`,
                  authoringColumnName: "region",
                },
              },
            },
          };
        }),
      ],
    });
    const original = JSON.stringify(document);
    expect(() => {
      return AvaPageDataMigrationV5.downgrade(document);
    }).toThrow(/global filter.*cannot be represented.*v4/i);
    expect(JSON.stringify(document)).toBe(original);
  },
);
