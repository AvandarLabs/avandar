import type {
  V1_AvaPageData,
  V2_AvaPageData,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV2/AvaPageDataMigrationV2.types";

import { propEq } from "@avandar/utils";
import { beforeAll, describe, expect, it } from "vitest";

import { AvaPageDataMigrationV2 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV2/AvaPageDataMigrationV2";
import { AvaPageDataMigrator } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";

const TEST_PROMPT = "Find all covid data";
const TEST_SQL = "SELECT * FROM some_covid_table;";
const TEST_DATA_VIZ_ID = "some-uuid";

const v1Data: V1_AvaPageData = {
  root: {
    props: {
      title: "v1 Dashboard",
      author: "John Doe",
      publishedAt: "2021-01-01",
      subtitle: "A subtitle",
      horizontalPadding: "none",
      verticalPadding: "none",
      containerMaxWidth: {
        unit: "%",
        value: 100,
      },
      isAuthorHidden: false,
      isPublishedAtHidden: false,
      isSubtitleHidden: false,
      isTitleHidden: false,
      schemaVersion: 1,
    },
  },
  content: [
    {
      type: "DataViz",
      props: {
        id: TEST_DATA_VIZ_ID,
        nlQuery: {
          prompt: TEST_PROMPT,
          rawSql: TEST_SQL,
          generations: [
            {
              prompt: TEST_PROMPT,
              rawSql: TEST_SQL,
            },
          ],
        },
      },
    },
  ],
};

const v2Data: V2_AvaPageData = {
  root: {
    props: {
      title: "v2 Dashboard",
      author: "John Doe",
      publishedAt: "2021-01-01",
      subtitle: "A subtitle",
      horizontalPadding: "none",
      verticalPadding: "none",
      containerMaxWidth: {
        unit: "%",
        value: 100,
      },
      isAuthorHidden: false,
      isPublishedAtHidden: false,
      isSubtitleHidden: false,
      isTitleHidden: false,
      schemaVersion: 2,
    },
  },
  content: [
    {
      type: "DataViz",
      props: {
        id: TEST_DATA_VIZ_ID,
        nlQuery: {
          prompt: TEST_PROMPT,
          rawSql: TEST_SQL,
          generations: [
            {
              prompt: TEST_PROMPT,
              rawSql: TEST_SQL,
            },
          ],
        },
        vizType: "table",
        vizConfig: { vizType: "table" },
      },
    },
  ],
};

describe("AvaPageConfigMigration - v2", () => {
  beforeAll(() => {
    AvaPageDataMigrator.registerMigrations([AvaPageDataMigrationV2]);
  });

  it("should upgrade the AvaPageConfig data to version 2", () => {
    const upgradedData = AvaPageDataMigrator.upgradeOnce(v1Data);
    expect(getVersionFromAvaPageData(upgradedData)).toEqual(2);
  });

  it("should downgrade the AvaPageConfig data to version 1", () => {
    const downgradedData = AvaPageDataMigrator.downgradeOnce(v2Data);
    expect(getVersionFromAvaPageData(downgradedData)).toEqual(1);
  });

  it("should upgrade DataViz to include `vizType` and `vizConfig` defaults", () => {
    const upgradedData = AvaPageDataMigrator.upgradeOnce(v1Data);
    const upgradedDataViz = upgradedData.content.find(
      propEq("type", "DataViz"),
    );

    expect(upgradedDataViz).toEqual({
      type: "DataViz",
      props: {
        id: TEST_DATA_VIZ_ID,
        nlQuery: {
          prompt: TEST_PROMPT,
          rawSql: TEST_SQL,
          generations: [
            {
              prompt: TEST_PROMPT,
              rawSql: TEST_SQL,
            },
          ],
        },
        vizType: "table",
        vizConfig: { vizType: "table" },
      },
    });
  });

  it("should downgrade DataViz by stripping `vizType` and `vizConfig`", () => {
    const downgradedData = AvaPageDataMigrator.downgradeOnce(v2Data);
    const downgradedDataViz = downgradedData.content.find(
      propEq("type", "DataViz"),
    );

    expect(downgradedDataViz).toEqual({
      type: "DataViz",
      props: {
        id: TEST_DATA_VIZ_ID,
        nlQuery: {
          prompt: TEST_PROMPT,
          rawSql: TEST_SQL,
          generations: [
            {
              prompt: TEST_PROMPT,
              rawSql: TEST_SQL,
            },
          ],
        },
      },
    });
  });
});
