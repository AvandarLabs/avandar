import { transformProps } from "@puckeditor/core";
import { AvaPageDataMigration } from "../AvaPageDataMigrator";
import type {
  V0_AvaPageData,
  V0_AvaPageRootProps,
  V0_PBlockPropsRegistry,
  V1_AvaPageData,
  V1_AvaPageRootProps,
  V1_PBlockPropsRegistry,
} from "./AvaPageDataMigrationV1.types";

const SCHEMA_VERSION = 1;

export const AvaPageDataMigrationV1 = {
  downgradedVersion: undefined,
  upgradedVersion: SCHEMA_VERSION,

  /**
   * Upgrade from dashboard v0 to v1.
   * This changes the old DataViz block to now hold an `nlQuery` object.
   */
  upgrade: (prevData: V0_AvaPageData): V1_AvaPageData => {
    return transformProps<
      V0_PBlockPropsRegistry,
      V0_AvaPageRootProps,
      V1_PBlockPropsRegistry,
      V1_AvaPageRootProps
    >(prevData, {
      root: (props) => {
        return {
          ...props,
          schemaVersion: SCHEMA_VERSION,
        };
      },
      DataViz: (props) => {
        const { prompt, sql } = props;
        return {
          nlQuery: {
            prompt: String(prompt),
            rawSql: String(sql),
            generations: [
              {
                prompt: String(prompt),
                rawSql: String(sql),
              },
            ],
          },
        };
      },
    });
  },

  downgrade: (currData: V1_AvaPageData): V0_AvaPageData => {
    return transformProps<
      V1_PBlockPropsRegistry,
      V1_AvaPageRootProps,
      V0_PBlockPropsRegistry,
      V0_AvaPageRootProps
    >(currData, {
      root: (props) => {
        const { schemaVersion, ...rest } = props;
        return { ...rest };
      },
      DataViz: (props) => {
        const { nlQuery } = props;
        return {
          prompt: nlQuery.prompt,
          sql: nlQuery.rawSql,
          generateSqlRequestId: "",
          sqlError: "",
          sqlGeneratedFromPrompt: nlQuery.rawSql,
        };
      },
    });
  },
} satisfies AvaPageDataMigration<V0_AvaPageData, V1_AvaPageData>;
