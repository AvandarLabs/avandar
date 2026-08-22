import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";

/**
 * @deprecated Prefer `buildPendingDashboardBlock`. Kept for existing tests.
 */
export function buildPendingDataVizBlock(
  block: Extract<ChatGeneratedDashboardBlock, { kind: "DataViz" }>,
): AvaPageData["content"][number] {
  return buildPendingDashboardBlock(block);
}
