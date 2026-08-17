import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Counts the blocks on a dashboard, returning zero when the config carries
 * none.
 *
 * A config written before the Ava Page shape existed carries no blocks at all,
 * which reads as zero rather than an error.
 */
export function getBlockCountFromDashboard(dashboard: Dashboard.T): number {
  // The config column is JSON, so nothing at the type level guarantees the Ava
  // Page shape. `AvaPageGenericData` declares `content` as required, which
  // would make the zero fallback look dead, so this asserts only the part it
  // actually relies on: a `content` array that may be absent.
  const config = dashboard.config as {
    content?: AvaPageGenericData["content"];
  };
  return config.content?.length ?? 0;
}
