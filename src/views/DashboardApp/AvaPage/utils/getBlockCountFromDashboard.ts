import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Counts the blocks on a dashboard, returning zero when the config carries
 * none.
 *
 * A dashboard's config is stored as JSON, so nothing at the type level
 * guarantees the Ava Page shape. `AvaPageGenericData` declares `content` as
 * required, which would make the zero fallback look dead, so this asserts only
 * the part it actually relies on: a `content` array that may be absent.
 */
export function getBlockCountFromDashboard(dashboard: Dashboard.T): number {
  const config = dashboard.config as {
    content?: AvaPageGenericData["content"];
  };
  return config.content?.length ?? 0;
}
