import { beforeAll, describe, expect, it } from "vitest";
import { propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { AvaPageDataMigrator } from "../AvaPageDataMigrator";
import { getVersionFromAvaPageData } from "../getVersionFromAvaPageData";
import { AvaPageDataMigrationV1 } from "./AvaPageDataMigrationV1";
import type {
  V0_AvaPageData,
  V1_AvaPageData,
} from "./AvaPageDataMigrationV1.types";

const TEST_PROMPT = "Find all covid data";
const TEST_SQL = "SELECT * FROM some_covid_table;";
const TEST_DATA_VIZ_ID = "some-uuid";

const v0Data: V0_AvaPageData = {
  root: {
    props: {
      title: "v0 Dashboard",
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
    },
  },
  content: [
    {
      type: "DataViz",
      props: {
        id: TEST_DATA_VIZ_ID,
        prompt: TEST_PROMPT,
        sql: TEST_SQL,
        generateSqlRequestId: "123",
        sqlError: "",
        sqlGeneratedFromPrompt: TEST_SQL,
      },
    },
  ],
};

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

describe("AvaPageConfigMigration - v1", () => {
  beforeAll(() => {
    AvaPageDataMigrator.registerMigrations([AvaPageDataMigrationV1]);
  });

  it("should upgrade the AvaPageConfig data to version 1", () => {
    const upgradedData = AvaPageDataMigrator.upgrade(v0Data);
    expect(getVersionFromAvaPageData(upgradedData)).toEqual(1);
  });

  it("should downgrade the AvaPageConfig data to version undefined", () => {
    const downgradedData = AvaPageDataMigrator.downgradeOnce(v1Data);
    expect(getVersionFromAvaPageData(downgradedData)).toEqual(undefined);
  });

  it("should upgrade the DataViz block to hold an `nlQuery`object", () => {
    const upgradedData = AvaPageDataMigrator.upgrade(v0Data);
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
      },
    });
  });

  it("should downgrade the DataViz block to hold `prompt, `sql`, and `sqlGeneratedFromPrompt` and empty string for the rest", () => {
    const downgradedData = AvaPageDataMigrator.downgradeOnce(v1Data);
    const downgradedDataViz = downgradedData.content.find(
      propEq("type", "DataViz"),
    );

    expect(downgradedDataViz).toEqual({
      type: "DataViz",
      props: {
        id: TEST_DATA_VIZ_ID,
        prompt: TEST_PROMPT,
        sql: TEST_SQL,
        generateSqlRequestId: "",
        sqlError: "",
        sqlGeneratedFromPrompt: TEST_SQL,
      },
    });
  });
});
