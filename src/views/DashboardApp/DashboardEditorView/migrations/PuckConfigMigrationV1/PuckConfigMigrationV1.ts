import { transformProps } from "@puckeditor/core";
import { isString } from "$/lib/utils/guards/isString";
import type { DashboardGenericData } from "../../utils/puck.types";

const SCHEMA_VERSION = 1;

export const PuckConfigMigrationV1 = {
  downgradedVersion: undefined,
  upgradedVersion: SCHEMA_VERSION,
  upgrade: (prevData: DashboardGenericData): DashboardGenericData => {
    return transformProps(prevData, {
      root: (props) => {
        return {
          ...props,
          schemaVersion: SCHEMA_VERSION,
        };
      },
      DataViz: (props) => {
        const { prompt, sql } = props;
        if (isString(prompt) && isString(sql)) {
          return {
            nlQuery: {
              prompt,
              rawSql: sql,
              generations: [
                {
                  prompt,
                  rawSql: sql,
                },
              ],
            },
          };
        }
        return props;
      },
    }) as DashboardGenericData;
  },

  downgrade: (currData: DashboardGenericData): DashboardGenericData => {
    return transformProps(currData, {
      root: (props) => {
        return {
          ...props,
          schemaVersion: undefined,
        };
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
    }) as DashboardGenericData;
  },
};
