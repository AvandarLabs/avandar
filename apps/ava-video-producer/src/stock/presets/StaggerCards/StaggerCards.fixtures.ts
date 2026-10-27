import { STOCK } from "../../stockPalette";
import type { StaggerCardsInput } from "./StaggerCards.schema";

/** Complete fictional example used only when input is omitted. */
export const staggerCardsDefaultInput: StaggerCardsInput = {
  cards: [
    { label: "Source", detail: "Bring it together", color: STOCK.cyan },
    { label: "Structure", detail: "Give it a shape", color: STOCK.mint },
    { label: "Connect", detail: "Find the links", color: STOCK.orange },
    { label: "Explore", detail: "Follow the thread", color: STOCK.orange },
    { label: "Refine", detail: "Make it clearer", color: STOCK.cyan },
    { label: "Share", detail: "Put it in motion", color: STOCK.mint },
  ],
  heading: "A system, assembled.",
  showChecks: true,
};

/** The maximum supported collection density in the authored layout. */
export const staggerCardsDenseInput: StaggerCardsInput = {
  ...staggerCardsDefaultInput,
};

/** A complete smaller or differently selected authored example. */
export const staggerCardsChangedInput: StaggerCardsInput = {
  ...staggerCardsDefaultInput,
  cards: [{ label: "Review", detail: "Authored card", color: STOCK.cyan }],
  heading: "One authored card",
  showChecks: false,
};

/** Named examples available to editors and semantic regression checks. */
export const staggerCardsFixtures: Array<{
  id: string;
  input: {
    cards: Array<{ label: string; detail: string; color: string }>;
    heading: string;
    showChecks: boolean;
  };
}> = [
  { id: "default", input: staggerCardsDefaultInput },
  { id: "dense", input: staggerCardsDenseInput },
  { id: "changed", input: staggerCardsChangedInput },
];
