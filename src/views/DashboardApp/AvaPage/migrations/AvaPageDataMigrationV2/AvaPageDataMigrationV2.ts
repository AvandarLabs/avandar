import type {
  V1_AvaPageData,
  V1_AvaPageRootProps,
  V1_PBlockPropsRegistry,
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_PBlockPropsRegistry,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV2/AvaPageDataMigrationV2.types";

import { transformProps } from "@puckeditor/core";

import { AvaPageDataMigration } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";

const SCHEMA_VERSION = 2;

/**
 * Upgrade from dashboard v1 to v2.
 * This adds `vizType` and `vizConfig` (defaulting to "table") to existing
 * DataViz blocks so the dashboard's Data Visualization block can support all
 * visualizations the Data Explorer supports.
 */
export const AvaPageDataMigrationV2 = {
  downgradedVersion: 1,
  upgradedVersion: SCHEMA_VERSION,

  upgrade: (prevData: V1_AvaPageData): V2_AvaPageData => {
    return transformProps<
      V1_PBlockPropsRegistry,
      V1_AvaPageRootProps,
      V2_PBlockPropsRegistry,
      V2_AvaPageRootProps
    >(prevData, {
      root: (props) => {
        return {
          ...props,
          schemaVersion: SCHEMA_VERSION,
        };
      },
      DataViz: (props) => {
        return {
          nlQuery: props.nlQuery,
          vizType: "table",
          vizConfig: { vizType: "table" },
        };
      },
    });
  },

  downgrade: (currData: V2_AvaPageData): V1_AvaPageData => {
    return transformProps<
      V2_PBlockPropsRegistry,
      V2_AvaPageRootProps,
      V1_PBlockPropsRegistry,
      V1_AvaPageRootProps
    >(currData, {
      root: (props) => {
        return {
          ...props,
          schemaVersion: 1,
        };
      },
      DataViz: (props) => {
        return {
          nlQuery: props.nlQuery,
        };
      },
    });
  },
} satisfies AvaPageDataMigration<V1_AvaPageData, V2_AvaPageData>;
