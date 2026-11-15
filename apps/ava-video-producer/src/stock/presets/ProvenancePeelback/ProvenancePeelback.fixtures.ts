import type { Input } from "./ProvenancePeelback.schema";
/** Complete fictional fallback used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  summary: {
    label: "Fictional stock note",
    text: "The sample register lists labels in Bay C.",
  },
  sources: [
    {
      id: "register",
      title: "Sample register",
      locator: "Row C",
      excerpt: "Bay C | Labels",
    },
    {
      id: "notes",
      title: "Sample review notes",
      locator: "Note 2",
      excerpt: "Use the register for item locations.",
    },
  ],
  selectedSourceId: "register",
  citationLabel: "Source passage",
  showLocators: true,
  sourceArrangement: "fan",
};
/** Minimum, dense, changed and data-boundary cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      summary: {
        label: "A",
        text: "A",
      },
      sources: [
        {
          id: "",
          title: "",
          locator: "",
          excerpt: "",
        },
        {
          id: "item-1",
          title: "",
          locator: "",
          excerpt: "",
        },
      ],
      selectedSourceId: "",
      citationLabel: "A",
      showLocators: false,
      sourceArrangement: "parallel-sheets",
    },
  },
  {
    id: "dense",
    input: {
      summary: {
        label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        text: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      sources: [
        {
          id: "item-0",
          title: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          locator: "WWWWWWWWWWWWWWWWWWWWWWWW",
          excerpt:
            "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-1",
          title: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          locator: "WWWWWWWWWWWWWWWWWWWWWWWW",
          excerpt:
            "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-2",
          title: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          locator: "WWWWWWWWWWWWWWWWWWWWWWWW",
          excerpt:
            "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      selectedSourceId: "item-1",
      citationLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      showLocators: true,
      sourceArrangement: "fan",
    },
  },
  {
    id: "changed",
    input: {
      summary: {
        label: "Fictional stock note",
        text: "The sample register lists labels in Bay C.",
      },
      sources: [
        {
          id: "context",
          title: "Fictional context",
          locator: "Page 3",
          excerpt: "Example review context.",
        },
        {
          id: "observation",
          title: "Fictional extracted figure",
          locator: "Page 6, upper region",
          excerpt: "Observed count: 12 (40).",
        },
      ],
      selectedSourceId: "observation",
      citationLabel: "Source passage",
      showLocators: true,
      sourceArrangement: "parallel-sheets",
    },
  },
];
/** Explicit malformed documents rejected by the strict runtime schema. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    sources: [
      { ...DEFAULT_INPUT.sources[0], id: "" },
      { ...DEFAULT_INPUT.sources[1], id: "" },
    ],
  },
  {},
  { ...DEFAULT_INPUT, unexpected: true },
  { ...DEFAULT_INPUT, sources: [] },
  {
    ...DEFAULT_INPUT,
    sources: [DEFAULT_INPUT.sources[0], DEFAULT_INPUT.sources[0]],
  },
  {
    ...DEFAULT_INPUT,
    sources: [
      { ...DEFAULT_INPUT.sources[0], unexpected: true },
      ...DEFAULT_INPUT.sources.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    sources: [
      { ...DEFAULT_INPUT.sources[0], id: "X".repeat(50) },
      ...DEFAULT_INPUT.sources.slice(1),
    ],
  },
  { ...DEFAULT_INPUT, selectedSourceId: "missing" },
  {
    ...DEFAULT_INPUT,
    summary: { ...DEFAULT_INPUT.summary, text: "X".repeat(83) },
  },
  { ...DEFAULT_INPUT, sourceArrangement: "unknown" },
];
