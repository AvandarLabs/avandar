/**
 * This file contains the types for the AvaPageData v1 and v2.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this file
 *    purely isolated to this module.
 * 2. ONLY import `AvaPageTypes` if this is the migration module for the most
 *    recent version.
 * 3. Once this module no longer represents the most recent version, remove
 *    the `AvaPageTypes` import and manually write out the types.
 *
 * Reasoning:
 * - We want to keep a statically readable history of each version's types so
 *   different versions can be individually referenced and tested.
 * - Avoid long import chains of legacy code.
 * - We want to allow the most current AvaPage types to change freely without
 *   raising type errors in tests or migration code for older versions.
 */
import type { AvaPageTypes } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type {
  V1_AvaPageData,
  V1_AvaPageRootProps,
  V1_PBlockPropsRegistry,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV1/AvaPageDataMigrationV1.types";

export type {
  V1_AvaPageData,
  V1_AvaPageRootProps,
  V1_PBlockPropsRegistry,
};

export type V2_AvaPageRootProps = AvaPageTypes["RootProps"];
export type V2_PBlockPropsRegistry = AvaPageTypes["PBlockPropsRegistry"];
export type V2_AvaPageData = AvaPageTypes["Data"];
