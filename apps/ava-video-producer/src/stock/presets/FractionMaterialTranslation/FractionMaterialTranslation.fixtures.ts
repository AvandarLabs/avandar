import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./FractionMaterialTranslation.schema";
/** Fictional complete examples and deliberately invalid author inputs. */
export const DEFAULT_INPUT: Input = {
  fraction: {
    numerator: 1,
    denominator: 2,
  },
  representations: [
    {
      id: "paper",
      learnerLabel: "Learner A",
      materialLabel: "Folded paper",
      material: "folded-paper",
    },
    {
      id: "counters",
      learnerLabel: "Learner B",
      materialLabel: "Counters",
      material: "counters",
    },
    {
      id: "board",
      learnerLabel: "Learner C",
      materialLabel: "Shaded board",
      material: "shaded-board",
    },
  ],
  lessonLabel: "Show the same fraction",
  showFractionNotation: true,
  resolvedArrangement: "shared-table",
  caption: "Fictional lesson with multiple representations",
};
/** Eight equal units remain the common denominator for every material. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  fraction: { numerator: 8, denominator: 8 },
  resolvedArrangement: "separate-desks",
};
/** Schema rejection examples. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, fraction: { numerator: 3, denominator: 2 } },
  { ...DEFAULT_INPUT, fraction: { numerator: 0, denominator: 2 } },
  { ...DEFAULT_INPUT, fraction: { numerator: 1, denominator: 9 } },
  { ...DEFAULT_INPUT, fraction: { numerator: 1.5, denominator: 2 } },
  {
    ...DEFAULT_INPUT,
    representations: [
      DEFAULT_INPUT.representations[0],
      DEFAULT_INPUT.representations[0],
    ],
  },
];
/** Two materials, hidden notation, and the smallest accepted denominator. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  representations: DEFAULT_INPUT.representations.slice(0, 2),
  showFractionNotation: false,
  resolvedArrangement: "separate-desks",
};
/** Maximum denominator, all materials and maximum accepted label lengths. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  fraction: { numerator: 1, denominator: 8 },
  representations: DEFAULT_INPUT.representations.map((representation) => ({
    ...representation,
    learnerLabel: "界".repeat(16),
    materialLabel: "界".repeat(22),
  })),
  lessonLabel: "界".repeat(36),
  caption: "界".repeat(56),
};
/** Complete variants cover full selection and separate surface comparison. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
];
