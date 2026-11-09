import type { AgentPageTile } from "$/agent/pageContext/AgentPageContext.ts";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget.ts";

/**
 * What the agent may learn about one mentioned or attached gadget, loaded
 * with the user's own access. Metadata only: names, chart SQL the user can
 * already see, field and layer names. Never rows. `unavailable` covers a
 * deleted gadget, one the user cannot open, one from another workspace,
 * and one that failed to load.
 */
export type AgentGadgetContext =
  | {
      kind: "dashboard";
      ref: Gadget.Ref;
      name: string;
      tiles: readonly AgentPageTile[];
    }
  | {
      kind: "dashboard_tile";
      ref: Gadget.Ref;
      dashboardName: string;
      tile: AgentPageTile;
    }
  | { kind: "dataset"; ref: Gadget.Ref; name: string }
  | {
      kind: "map";
      ref: Gadget.Ref;
      name: string;
      layers: ReadonlyArray<{ name: string; sourceName?: string }>;
    }
  | {
      kind: "concept";
      ref: Gadget.Ref;
      name: string;
      fieldNames: readonly string[];
    }
  | { kind: "unavailable"; ref: Gadget.Ref };

/** Items the context tray holds. */
export const MAX_ATTACHED_GADGETS = 5;

/** Mentions in one message that get metadata. Later ones are named only. */
export const MAX_DESCRIBED_MENTIONS = 5;

/** Charts with SQL across the attached and mentioned blocks together. */
export const MAX_GADGET_BLOCK_TILES = 24;

/** Field names listed for one case type. The rest are counted. */
export const MAX_CASE_TYPE_FIELDS = 40;

const UNAVAILABLE_NAMES: Readonly<Record<Gadget.Type, string>> = {
  dashboard: "an unavailable dashboard",
  dashboard_tile: "an unavailable chart",
  dataset: "an unavailable dataset",
  map: "an unavailable map",
  concept: "an unavailable case type",
  individual: "an unavailable case",
};

/** How the model hears of a gadget it cannot see. Model-facing English. */
export function getUnavailableGadgetName(ref: Gadget.Ref): string {
  return UNAVAILABLE_NAMES[ref.gadgetType];
}

/**
 * A gadget's own name before any masking: a tile's title, an unavailable
 * gadget's type phrase, and every other gadget's name. Use it where the
 * user's own device shows the name (labels, today's chat, offline turns).
 * The agent path masks it first.
 */
export function getAgentGadgetName(context: AgentGadgetContext): string {
  switch (context.kind) {
    case "dashboard_tile":
      return context.tile.title;
    case "unavailable":
      return getUnavailableGadgetName(context.ref);
    default:
      return context.name;
  }
}
