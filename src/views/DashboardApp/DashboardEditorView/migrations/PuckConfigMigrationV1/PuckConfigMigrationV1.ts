import { transformProps } from "@puckeditor/core";
import { PuckConfigVersionMigration } from "../PuckConfigVersionMigrator";
import {
  V0_DashboardBlocksProps,
  V0_DashboardData,
  V0_DashboardRootProps,
  V1_DashboardBlocksProps,
  V1_DashboardData,
  V1_DashboardRootProps,
} from "./PuckConfigMigrationV1.types";

const SCHEMA_VERSION = 1;

export const PuckConfigMigrationV1 = {
  downgradedVersion: undefined,
  upgradedVersion: SCHEMA_VERSION,
  upgrade: (prevData: V0_DashboardData): V1_DashboardData => {
    return transformProps<
      V0_DashboardBlocksProps,
      V0_DashboardRootProps,
      V1_DashboardBlocksProps,
      V1_DashboardRootProps
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

  downgrade: (currData: V1_DashboardData): V0_DashboardData => {
    return transformProps<
      V1_DashboardBlocksProps,
      V1_DashboardRootProps,
      V0_DashboardBlocksProps,
      V0_DashboardRootProps
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
} satisfies PuckConfigVersionMigration<V0_DashboardData, V1_DashboardData>;
