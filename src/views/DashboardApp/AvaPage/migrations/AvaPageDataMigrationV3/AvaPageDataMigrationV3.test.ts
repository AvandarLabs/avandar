import { propEq } from "@utils";
import { beforeAll, describe, expect, it } from "vitest";
import { AvaPageDataMigrationV3 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3";
import { AvaPageDataMigrator } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import type {
  V2_AvaPageData,
  V3_AvaPageData,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3.types";

const TEST_PROMPT = "Find me data";
const TEST_SQL = "SELECT * FROM t;";
const TEST_DATA_VIZ_ID = "some-uuid";

const NL_QUERY = {
  prompt: TEST_PROMPT,
  rawSql: TEST_SQL,
  generations: [{ prompt: TEST_PROMPT, rawSql: TEST_SQL }],
};

const V2_ROOT_PROPS = {
  title: "Dashboard",
  author: "John Doe",
  publishedAt: "2021-01-01",
  subtitle: "A subtitle",
  horizontalPadding: "none" as const,
  verticalPadding: "none" as const,
  containerMaxWidth: { unit: "%" as const, value: 100 },
  isAuthorHidden: false,
  isPublishedAtHidden: false,
  isSubtitleHidden: false,
  isTitleHidden: false,
};

function v2Dashboard(
  vizConfig: V2_AvaPageData["content"][number]["props"] extends infer P ?
    P extends { vizConfig: infer V } ?
      V
    : never
  : never,
  vizType: V2_AvaPageData["content"][number]["props"] extends infer P ?
    P extends { vizType: infer T } ?
      T
    : never
  : never,
): V2_AvaPageData {
  return {
    root: { props: { ...V2_ROOT_PROPS, schemaVersion: 2 } },
    content: [
      {
        type: "DataViz",
        props: { id: TEST_DATA_VIZ_ID, nlQuery: NL_QUERY, vizType, vizConfig },
      },
    ],
  };
}

describe("AvaPageDataMigration - v3", () => {
  beforeAll(() => {
    AvaPageDataMigrator.registerMigrations([AvaPageDataMigrationV3]);
  });

  it("upgrades the schema version to 3", () => {
    const upgraded = AvaPageDataMigrator.upgradeOnce(
      v2Dashboard({ vizType: "table" }, "table"),
    );
    expect(getVersionFromAvaPageData(upgraded)).toEqual(3);
  });

  it("downgrades the schema version to 2", () => {
    const v3: V3_AvaPageData = {
      root: {
        props: {
          ...V2_ROOT_PROPS,
          schemaVersion: 3,
          theme: "default",
          typography: "system",
        },
      },
      content: [
        {
          type: "DataViz",
          props: {
            id: TEST_DATA_VIZ_ID,
            nlQuery: NL_QUERY,
            vizType: "table",
            vizConfig: { vizType: "table" },
          },
        },
      ],
    };
    const downgraded = AvaPageDataMigrator.downgradeOnce(v3);
    expect(getVersionFromAvaPageData(downgraded)).toEqual(2);
  });

  it("upgrades a bar config from single-key to series array", () => {
    const upgraded = AvaPageDataMigrationV3.upgrade(
      v2Dashboard(
        {
          vizType: "bar",
          xAxisKey: "month",
          yAxisKey: "revenue",
          withLegend: true,
          color: "#f00",
        },
        "bar",
      ),
    );
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toEqual({
      vizType: "bar",
      xAxisKey: "month",
      series: [{ renderAs: "bar", key: "revenue", color: "#f00" }],
      layout: "group",
      withLegend: true,
    });
  });

  it("upgrades a line config preserving curveType", () => {
    const upgraded = AvaPageDataMigrationV3.upgrade(
      v2Dashboard(
        {
          vizType: "line",
          xAxisKey: "month",
          yAxisKey: "revenue",
          withLegend: false,
          curveType: "linear",
          color: "#0f0",
        },
        "line",
      ),
    );
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toEqual({
      vizType: "line",
      xAxisKey: "month",
      series: [
        {
          renderAs: "line",
          key: "revenue",
          color: "#0f0",
          curveType: "linear",
        },
      ],
      withLegend: false,
    });
  });

  it("upgrades an area config seeding default fill opacity", () => {
    const upgraded = AvaPageDataMigrationV3.upgrade(
      v2Dashboard(
        {
          vizType: "area",
          xAxisKey: "month",
          yAxisKey: "revenue",
          withLegend: true,
          curveType: "monotone",
        },
        "area",
      ),
    );
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toEqual({
      vizType: "area",
      xAxisKey: "month",
      series: [
        {
          renderAs: "area",
          key: "revenue",
          color: undefined,
          curveType: "monotone",
          fillOpacity: 0.6,
        },
      ],
      layout: "default",
      withLegend: true,
    });
  });

  it("upgrades a radar config to a single radar series", () => {
    const upgraded = AvaPageDataMigrationV3.upgrade(
      v2Dashboard(
        {
          vizType: "radar",
          nameKey: "category",
          valueKey: "value",
          color: "#00f",
        },
        "radar",
      ),
    );
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toEqual({
      vizType: "radar",
      nameKey: "category",
      series: [{ key: "value", color: "#00f" }],
      withLegend: true,
    });
  });

  it("upgrades a bar config without a yAxisKey to empty series", () => {
    const upgraded = AvaPageDataMigrationV3.upgrade(
      v2Dashboard(
        {
          vizType: "bar",
          xAxisKey: undefined,
          yAxisKey: undefined,
          withLegend: true,
        },
        "bar",
      ),
    );
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toMatchObject({
      vizType: "bar",
      series: [],
      layout: "group",
    });
  });

  it("downgrades a multi-series bar by keeping the first series", () => {
    const v3: V3_AvaPageData = {
      root: {
        props: {
          ...V2_ROOT_PROPS,
          schemaVersion: 3,
          theme: "default",
          typography: "system",
        },
      },
      content: [
        {
          type: "DataViz",
          props: {
            id: TEST_DATA_VIZ_ID,
            nlQuery: NL_QUERY,
            vizType: "bar",
            vizConfig: {
              vizType: "bar",
              xAxisKey: "month",
              series: [
                { renderAs: "bar", key: "revenue", color: "#f00" },
                { renderAs: "bar", key: "expenses", color: "#0f0" },
              ],
              layout: "group",
              withLegend: true,
            },
          },
        },
      ],
    };
    const downgraded = AvaPageDataMigrationV3.downgrade(v3);
    const dataViz = downgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toEqual({
      vizType: "bar",
      xAxisKey: "month",
      yAxisKey: "revenue",
      withLegend: true,
      color: "#f00",
    });
  });

  it("passes pie / funnel / scatter / bubble through unchanged in shape", () => {
    const upgraded = AvaPageDataMigrationV3.upgrade(
      v2Dashboard(
        {
          vizType: "scatter",
          xAxisKey: "x",
          yAxisKey: "y",
        },
        "scatter",
      ),
    );
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: { vizConfig: unknown } }
      | undefined;
    expect(dataViz?.props.vizConfig).toEqual({
      vizType: "scatter",
      xAxisKey: "x",
      yAxisKey: "y",
    });
  });
});
