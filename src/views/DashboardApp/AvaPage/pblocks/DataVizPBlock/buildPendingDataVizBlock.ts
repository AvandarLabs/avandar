import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { DEFAULT_GLOBAL_FILTER_SUBSCRIPTION } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";

/**
 * Convert a chat-generated dashboard block into a Puck content item ready to
 * be appended to an `AvaPageData.content` array. The block is given a fresh
 * id so multiple chat-driven blocks don't collide.
 */
export function buildPendingDataVizBlock(
  block: ChatGeneratedDashboardBlock,
): AvaPageData["content"][number] {
  return {
    type: "DataViz",
    props: {
      id: `DataViz-${crypto.randomUUID()}`,
      nlQuery: {
        prompt: block.prompt,
        rawSql: block.sql,
        generations: [
          {
            prompt: block.prompt,
            rawSql: block.sql,
          },
        ],
      },
      vizType: block.vizType,
      vizConfig: VizConfigs.makeEmptyConfig(block.vizType),
      globalFilterSubscription: DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
      localFilters: [],
    },
  };
}
