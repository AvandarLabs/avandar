/**
 * Types for the AvaPageData v4 schema.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this
 *    file purely isolated to this module.
 * 2. ONLY import `AvaPageTypes` if this is the migration module for the most
 *    recent version.
 * 3. Once this module no longer represents the most recent version, remove
 *    the `AvaPageTypes` import and manually write out the types.
 */
import type {
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V3_PBlockPropsRegistry,
  V3_VizConfig,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3.types";
import type { AvaPageTypes } from "@/views/DashboardApp/AvaPage/AvaPage.types";

export type {
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V3_PBlockPropsRegistry,
  V3_VizConfig,
};

export type V4_AvaPageRootProps = AvaPageTypes["RootProps"];
export type V4_PBlockPropsRegistry = AvaPageTypes["PBlockPropsRegistry"];
export type V4_AvaPageData = AvaPageTypes["Data"];
