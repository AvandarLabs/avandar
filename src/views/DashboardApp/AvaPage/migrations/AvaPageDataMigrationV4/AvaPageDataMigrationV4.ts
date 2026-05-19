import { transformProps } from "@puckeditor/core";
import { AvaPageDataMigration } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import type {
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V4_AvaPageData,
  V4_AvaPageRootProps,
  V4_PBlockPropsRegistry,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.types";

const SCHEMA_VERSION = 4;

/**
 * Upgrade from dashboard v3 to v4.
 *
 * Adds the per-viz filter fields to every `DataViz` block so existing
 * dashboards keep their visualizations working the same way they did under
 * v3 (subscribe to every dashboard filter, no viz-local filters).
 *
 * V3 had no FilterPBlock opt-out or local-filter mechanism; v4 introduces:
 *   - `globalFilterSubscription`: `{mode: "all" | "selected" | "none",
 *     subscribedFilterIds: string[]}`.
 *   - `localFilters`: viz-only filter controls that don't bleed into the
 *     global filter manager.
 *
 * The downgrade path strips both fields so a v3 reader doesn't choke.
 *
 * Like V3's migration, both sides of `transformProps` use the V4 registry
 * type (Puck's `transformProps` is invariant on the registry argument);
 * the runtime function works fine because it reads fields that exist on
 * the inbound V3 data and writes V4-shaped output.
 */
export const AvaPageDataMigrationV4 = {
  downgradedVersion: 3,
  upgradedVersion: SCHEMA_VERSION,

  upgrade: (prevData: V3_AvaPageData): V4_AvaPageData => {
    return transformProps<
      V4_PBlockPropsRegistry,
      V3_AvaPageRootProps,
      V4_PBlockPropsRegistry,
      V4_AvaPageRootProps
    >(prevData as unknown as V4_AvaPageData, {
      root: (props) => {
        return {
          ...props,
          schemaVersion: SCHEMA_VERSION,
        };
      },
      DataViz: ((props: {
        nlQuery: unknown;
        vizType: unknown;
        vizConfig: unknown;
      }) => {
        return {
          nlQuery: props.nlQuery,
          vizType: props.vizType,
          vizConfig: props.vizConfig,
          globalFilterSubscription: {
            mode: "all" as const,
            subscribedFilterIds: [],
          },
          localFilters: [],
        };
      }) as unknown as (
        props: V4_PBlockPropsRegistry["DataViz"],
      ) => V4_PBlockPropsRegistry["DataViz"],
    });
  },

  downgrade: (currData: V4_AvaPageData): V3_AvaPageData => {
    return transformProps<
      V4_PBlockPropsRegistry,
      V4_AvaPageRootProps,
      V4_PBlockPropsRegistry,
      V3_AvaPageRootProps
    >(currData, {
      root: (props) => {
        return { ...props, schemaVersion: 3 };
      },
      DataViz: ((props: V4_PBlockPropsRegistry["DataViz"]) => {
        const {
          globalFilterSubscription: _gfs,
          localFilters: _lf,
          ...rest
        } = props;
        return rest;
      }) as unknown as (
        props: V4_PBlockPropsRegistry["DataViz"],
      ) => V4_PBlockPropsRegistry["DataViz"],
    }) as unknown as V3_AvaPageData;
  },
} satisfies AvaPageDataMigration<V3_AvaPageData, V4_AvaPageData>;
