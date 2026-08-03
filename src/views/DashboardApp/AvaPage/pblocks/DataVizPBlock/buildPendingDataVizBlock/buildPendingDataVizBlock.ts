import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";

/**
 * @deprecated Prefer `buildPendingDashboardBlock`. Kept for existing tests.
 */
export function buildPendingDataVizBlock(
  block: Extract<ChatGeneratedDashboardBlock, { kind: "DataViz" }>,
): AvaPageData["content"][number] {
  return buildPendingDashboardBlock(block);
}
