import type { StaggerCardsInput } from "./StaggerCards.schema";

/** Complete fictional example used only when input is omitted. */
export const staggerCardsDefaultInput: StaggerCardsInput = {
  cards: [
    { label: "Source", detail: "Bring it together", color: "$color.accentAlt" },
    { label: "Structure", detail: "Give it a shape", color: "$color.accent" },
    { label: "Connect", detail: "Find the links", color: "$color.highlight" },
    {
      label: "Explore",
      detail: "Follow the thread",
      color: "$color.highlight",
    },
    { label: "Refine", detail: "Make it clearer", color: "$color.accentAlt" },
    { label: "Share", detail: "Put it in motion", color: "$color.accent" },
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
  cards: [
    { label: "Review", detail: "Authored card", color: "$color.accentAlt" },
  ],
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
