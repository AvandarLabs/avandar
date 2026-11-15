import type { Input } from "./SharedJigPreparation.schema";
/** Complete fictional default, used only for omitted input. */
export const DEFAULT_INPUT: Input = {
  makerLabel: "Guide maker",
  guide: { label: "Marking guide", pattern: "two-holes" },
  collaborators: [
    { id: "a", label: "Ari", workpieceLabel: "Panel A" },
    { id: "b", label: "Bo", workpieceLabel: "Panel B" },
  ],
  labels: {
    prepare: "Prepare the guide",
    apply: "Apply the same pattern",
    retained: "Guide remains reusable",
    example: "Fictional preparation example",
  },
  workpieceMaterial: "card",
  showAlignmentGuides: true,
};
/** Default, minimum, dense and changed semantic documents. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      makerLabel: "Guide maker",
      guide: { label: "Marking guide", pattern: "two-holes" },
      collaborators: [
        { id: "a", label: "Ari", workpieceLabel: "Panel A" },
        { id: "b", label: "Bo", workpieceLabel: "Panel B" },
      ],
      labels: {
        prepare: "Prepare the guide",
        apply: "Apply the same pattern",
        retained: "Guide remains reusable",
        example: "Fictional preparation example",
      },
      workpieceMaterial: "card",
      showAlignmentGuides: true,
    },
  },
  {
    id: "minimum",
    input: {
      makerLabel: "Guide maker",
      guide: { label: "Marking guide", pattern: "two-holes" },
      collaborators: [{ id: "a", label: "A", workpieceLabel: "A" }],
      labels: {
        prepare: "Prepare the guide",
        apply: "Apply the same pattern",
        retained: "Guide remains reusable",
        example: "Fictional preparation example",
      },
      workpieceMaterial: "fabric",
      showAlignmentGuides: false,
    },
  },
  {
    id: "dense",
    input: {
      makerLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      guide: { label: "WWWWWWWWWWWWWWWWWWWWWWWW", pattern: "two-holes" },
      collaborators: [
        {
          id: "aaaaaaaaaaaaaaaaaaaa",
          label: "WWWWWWWWWWWWWWWWWW",
          workpieceLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "bbbbbbbbbbbbbbbbbbbb",
          label: "WWWWWWWWWWWWWWWWWW",
          workpieceLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "cccccccccccccccccccc",
          label: "WWWWWWWWWWWWWWWWWW",
          workpieceLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      labels: {
        prepare: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        apply: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      workpieceMaterial: "card",
      showAlignmentGuides: true,
    },
  },
  {
    id: "changed",
    input: {
      makerLabel: "Guide maker",
      guide: { label: "Corner guide", pattern: "corner-mark" },
      collaborators: [
        { id: "a", label: "Ari", workpieceLabel: "Panel A" },
        { id: "b", label: "Bo", workpieceLabel: "Panel B" },
        { id: "c", label: "Cam", workpieceLabel: "Panel C" },
      ],
      labels: {
        prepare: "Prepare the guide",
        apply: "Apply the same pattern",
        retained: "Guide remains reusable",
        example: "Fictional preparation example",
      },
      workpieceMaterial: "fabric",
      showAlignmentGuides: false,
    },
  },
];
/** Invalid structures, bounds, and cross references. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, collaborators: [] },
  {
    ...DEFAULT_INPUT,
    collaborators: Array(4).fill(DEFAULT_INPUT.collaborators[0]),
  },
  {
    ...DEFAULT_INPUT,
    collaborators: [
      DEFAULT_INPUT.collaborators[0],
      DEFAULT_INPUT.collaborators[0],
    ],
  },
  { ...DEFAULT_INPUT, guide: { ...DEFAULT_INPUT.guide, pattern: "bad" } },
  { ...DEFAULT_INPUT, workpieceMaterial: "wood" },
  { ...DEFAULT_INPUT, showAlignmentGuides: "true" },
  { ...DEFAULT_INPUT, makerLabel: "" },
  { ...DEFAULT_INPUT, makerLabel: "W".repeat(25) },
  { ...DEFAULT_INPUT, guide: { ...DEFAULT_INPUT.guide, label: "" } },
  {
    ...DEFAULT_INPUT,
    guide: { ...DEFAULT_INPUT.guide, label: "W".repeat(25) },
  },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, id: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, id: "W".repeat(21) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, label: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, label: "W".repeat(19) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, workpieceLabel: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, workpieceLabel: "W".repeat(25) } : item,
    ),
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, prepare: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, prepare: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, apply: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, apply: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, retained: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, retained: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, example: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, guide: { ...DEFAULT_INPUT.guide, extra: true } },
  {
    ...DEFAULT_INPUT,
    collaborators: DEFAULT_INPUT.collaborators.map((item, index) =>
      index === 0 ? { ...item, extra: true } : item,
    ),
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
];
