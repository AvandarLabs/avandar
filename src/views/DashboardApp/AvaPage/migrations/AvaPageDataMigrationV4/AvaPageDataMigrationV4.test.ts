import { propEq } from "@utils";
import { beforeAll, describe, expect, it } from "vitest";
import { AvaPageDataMigrationV4 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4";
import { AvaPageDataMigrator } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import type {
  V3_AvaPageData,
  V4_AvaPageData,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.types";

const TEST_PROMPT = "Find me data";
const TEST_SQL = "SELECT * FROM t;";
const TEST_DATA_VIZ_ID = "some-uuid";

const NL_QUERY = {
  prompt: TEST_PROMPT,
  rawSql: TEST_SQL,
  generations: [{ prompt: TEST_PROMPT, rawSql: TEST_SQL }],
};

const V3_ROOT_PROPS = {
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
  theme: "default" as const,
  typography: "system" as const,
};

function v3Dashboard(): V3_AvaPageData {
  return {
    root: { props: { ...V3_ROOT_PROPS, schemaVersion: 3 } },
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
}

describe("AvaPageDataMigration - v4", () => {
  beforeAll(() => {
    AvaPageDataMigrator.registerMigrations([AvaPageDataMigrationV4]);
  });

  it("upgrades the schema version to 4", () => {
    const upgraded = AvaPageDataMigrator.upgradeOnce(v3Dashboard());
    expect(getVersionFromAvaPageData(upgraded)).toEqual(4);
  });

  it("seeds DataViz blocks with default filter props on upgrade", () => {
    const upgraded = AvaPageDataMigrationV4.upgrade(v3Dashboard());
    const dataViz = upgraded.content.find(propEq("type", "DataViz")) as
      | {
          type: "DataViz";
          props: {
            globalFilterSubscription: { mode: string };
            localFilters: readonly unknown[];
          };
        }
      | undefined;
    expect(dataViz?.props.globalFilterSubscription).toEqual({
      mode: "all",
      subscribedFilterIds: [],
    });
    expect(dataViz?.props.localFilters).toEqual([]);
  });

  it("preserves existing filter props on downgrade (drops them)", () => {
    const v4: V4_AvaPageData = {
      root: { props: { ...V3_ROOT_PROPS, schemaVersion: 4 } },
      content: [
        {
          type: "DataViz",
          props: {
            id: TEST_DATA_VIZ_ID,
            nlQuery: NL_QUERY,
            vizType: "table",
            vizConfig: { vizType: "table" },
            globalFilterSubscription: {
              mode: "selected",
              subscribedFilterIds: ["f-region"],
            },
            localFilters: [
              {
                id: "lf",
                label: "L",
                columnName: "c",
                mode: "select_single",
                optionsRaw: "a,b",
                defaultValue: "",
              },
            ],
          },
        },
      ],
    };
    const downgraded = AvaPageDataMigrator.downgradeOnce(v4);
    expect(getVersionFromAvaPageData(downgraded)).toEqual(3);
    const dataViz = downgraded.content.find(propEq("type", "DataViz")) as
      | { type: "DataViz"; props: Record<string, unknown> }
      | undefined;
    expect(dataViz?.props).not.toHaveProperty("globalFilterSubscription");
    expect(dataViz?.props).not.toHaveProperty("localFilters");
  });
});
