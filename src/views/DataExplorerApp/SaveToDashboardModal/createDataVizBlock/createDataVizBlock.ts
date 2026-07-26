import { uuid } from "$/lib/uuid";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * Fallback prompt used when the Data Explorer's `state.nlPrompt` is empty
 * (e.g. the SQL was hand-edited or loaded from the URL `?sql=` parameter).
 *
 * `DataVizPBlock` short-circuits to an "add a prompt" placeholder whenever
 * `nlQuery.prompt` is empty, so writing this default keeps the saved block
 * renderable inside the dashboard editor.
 */
export const DATA_EXPLORER_FALLBACK_PROMPT = "Saved from Data Explorer";

/**
 * The shape of a DataViz entry inside a dashboard's Puck `content` array.
 *
 * Mirrors the structure produced by the dashboard editor when a `DataViz`
 * block is dragged in and configured, and matches the seed payload used by
 * the e2e fixture in `tests/e2e/helpers/createDashboardWithDataVizBlock.ts`.
 * Kept loosely typed here because `shared` does not own the Puck props type
 * (it lives under `src/views/DashboardApp/AvaPage/pblocks/...`).
 */
export type DataVizDashboardBlock = {
  type: "DataViz";
  props: {
    id: string;
    nlQuery: {
      prompt: string;
      rawSql: string;
      generations: ReadonlyArray<{ prompt: string; rawSql: string }>;
    };
    vizType: VizType;
    vizConfig: VizConfig;
  };
};

/**
 * Build a DataViz dashboard block from the Data Explorer's current query and
 * visualization state.
 *
 * Stamps a fresh `props.id` per call so the block has a stable identifier
 * inside the dashboard's Puck data. The prompt and rawSQL are also pushed
 * into `generations` as the initial generation so the block behaves like one
 * created from the dashboard editor's NL query field.
 */
export function createDataVizBlock(args: {
  rawSQL: string;
  prompt: string | undefined;
  vizType: VizType;
  vizConfig: VizConfig;
}): DataVizDashboardBlock {
  const trimmedPrompt = args.prompt?.trim() ?? "";
  const normalizedPrompt =
    trimmedPrompt.length > 0 ? trimmedPrompt : DATA_EXPLORER_FALLBACK_PROMPT;
  return {
    type: "DataViz",
    props: {
      id: uuid(),
      nlQuery: {
        prompt: normalizedPrompt,
        rawSql: args.rawSQL,
        generations: [
          {
            prompt: normalizedPrompt,
            rawSql: args.rawSQL,
          },
        ],
      },
      vizType: args.vizType,
      vizConfig: args.vizConfig,
    },
  };
}
