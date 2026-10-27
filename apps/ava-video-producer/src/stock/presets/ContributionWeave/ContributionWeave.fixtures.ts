import type { Input } from "./ContributionWeave.schema";
/** Complete fictional collaborative textile. */
export const DEFAULT_INPUT: Input = {
  warp: [
    { id: "structure", label: "Example structure", pattern: "solid" },
    { id: "facts", label: "Example facts", pattern: "stripe" },
  ],
  weft: [
    { id: "words", label: "Example wording", pattern: "dot" },
    { id: "layout", label: "Example layout", pattern: "solid" },
  ],
  copy: {
    result: "Example shared field guide",
    example: "Fictional collaboration",
  },
  weaveStart: "over-first",
  showContributorEnds: true,
  showLabels: true,
};
/**
 * Bounded collections and alternative construction retain every contributor.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      warp: [
        { id: "", label: "A", pattern: "solid" },
        { id: "b", label: "B", pattern: "stripe" },
      ],
      showContributorEnds: false,
      showLabels: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      warp: Array.from({ length: 3 }, (_, index) => ({
        id: `warp ${index}`,
        label: "W".repeat(24),
        pattern: (["solid", "stripe", "dot"] as const)[index],
      })),
      weft: Array.from({ length: 3 }, (_, index) => ({
        id: `weft ${index}`,
        label: "W".repeat(24),
        pattern: (["dot", "solid", "stripe"] as const)[index],
      })),
      copy: { result: "W".repeat(34), example: "W".repeat(34) },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      weaveStart: "under-first",
      warp: DEFAULT_INPUT.warp.map((item) => ({
        ...item,
        label: `Shared ${item.id}`,
      })),
      copy: {
        result: "Example co-created guide",
        example: "Fictional partnership",
      },
    },
  },
];
