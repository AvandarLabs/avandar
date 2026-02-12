import { beforeAll, describe, expect, it } from "vitest";
import { propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { getVersionFromConfigData } from "../getVersionFromConfigData";
import { PuckConfigVersionMigrator } from "../PuckConfigVersionMigrator";
import { PuckConfigMigrationV1 } from "./PuckConfigMigrationV1";
import type { DashboardGenericData } from "../../utils/puck.types";

const TEST_PROMPT = "Find all covid data";
const TEST_SQL = "SELECT * FROM some_covid_table;";
const TEST_DATA_VIZ_ID = "some-uuid";

const v0Data = {
  root: {
    props: {
      title: "v0 Dashboard",
      schemaVersion: undefined,
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
  ] as const,
} as const satisfies DashboardGenericData;

const v1Data: DashboardGenericData = {
  root: {
    props: {
      title: "v1 Dashboard",
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

describe("PuckConfigMigration - v1", () => {
  beforeAll(() => {
    PuckConfigVersionMigrator.registerMigrations([PuckConfigMigrationV1]);
  });

  it("should upgrade the PuckConfig data to version 1", () => {
    const upgradedData = PuckConfigVersionMigrator.upgrade(v0Data);
    expect(getVersionFromConfigData(upgradedData)).toEqual(1);
  });

  it("should downgrade the PuckConfig data to version undefined", () => {
    const downgradedData = PuckConfigVersionMigrator.downgradeOnce(v1Data);
    expect(getVersionFromConfigData(downgradedData)).toEqual(undefined);
  });

  it("should upgrade the DataViz block to hold an `nlQuery`object", () => {
    const upgradedData = PuckConfigVersionMigrator.upgrade(v0Data);
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
    const downgradedData = PuckConfigVersionMigrator.downgradeOnce(v1Data);
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
