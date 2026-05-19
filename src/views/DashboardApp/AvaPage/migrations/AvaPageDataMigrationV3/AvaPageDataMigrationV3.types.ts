/**
 * This file contains the types for the AvaPageData v2 and v3.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this file
 *    purely isolated to this module.
 * 2. ONLY import `AvaPageTypes` if this is the migration module for the most
 *    recent version.
 * 3. Once this module no longer represents the most recent version, remove
 *    the `AvaPageTypes` import and manually write out the types.
 */
import type { AvaPageTypes } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type {
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_PBlockPropsRegistry,
  V2_VizConfig,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV2/AvaPageDataMigrationV2.types";

export type {
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_PBlockPropsRegistry,
  V2_VizConfig,
};

export type V3_AvaPageRootProps = AvaPageTypes["RootProps"];
export type V3_PBlockPropsRegistry = AvaPageTypes["PBlockPropsRegistry"];
export type V3_AvaPageData = AvaPageTypes["Data"];
