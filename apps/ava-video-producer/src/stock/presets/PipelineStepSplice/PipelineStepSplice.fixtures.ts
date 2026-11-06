import type { Input } from "./PipelineStepSplice.schema";
/** Complete fictional fallback used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  title: "Fictional preparation recipe",
  steps: [
    {
      id: "read",
      label: "Read rows",
      isInserted: false,
    },
    {
      id: "trim",
      label: "Trim spaces",
      isInserted: true,
    },
    {
      id: "save",
      label: "Save result",
      isInserted: false,
    },
  ],
  editLabel: "Add an operation",
  preview: {
    inputLabel: "Before trim",
    inputValue: "  Bay A",
    outputLabel: "After trim",
    outputValue: "Bay A",
  },
  showPreview: true,
  joinStyle: "tabbed",
};
/** Minimum, dense, changed and data-boundary cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      title: "A",
      steps: [
        {
          id: "item-0",
          label: "",
          isInserted: false,
        },
        {
          id: "",
          label: "",
          isInserted: true,
        },
        {
          id: "item-2",
          label: "",
          isInserted: false,
        },
      ],
      editLabel: "A",
      preview: {
        inputLabel: "",
        inputValue: "",
        outputLabel: "",
        outputValue: "",
      },
      showPreview: false,
      joinStyle: "continuous-ribbon",
    },
  },
  {
    id: "dense",
    input: {
      title: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      steps: [
        {
          id: "item-0",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          isInserted: false,
        },
        {
          id: "item-1",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          isInserted: true,
        },
        {
          id: "item-2",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          isInserted: false,
        },
        {
          id: "item-3",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          isInserted: false,
        },
        {
          id: "item-4",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          isInserted: false,
        },
      ],
      editLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      preview: {
        inputLabel: "WWWWWWWWWWWWWWWWWWWWWW",
        inputValue: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        outputLabel: "WWWWWWWWWWWWWWWWWWWWWW",
        outputValue: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showPreview: true,
      joinStyle: "tabbed",
    },
  },
  {
    id: "changed",
    input: {
      title: "Fictional preparation recipe",
      steps: [
        {
          id: "step-0",
          label: "Read rows",
          isInserted: false,
        },
        {
          id: "step-1",
          label: "Review",
          isInserted: false,
        },
        {
          id: "step-2",
          label: "Normalize",
          isInserted: true,
        },
        {
          id: "step-3",
          label: "Validate",
          isInserted: false,
        },
        {
          id: "step-4",
          label: "Save",
          isInserted: false,
        },
      ],
      editLabel: "Add an operation",
      preview: {
        inputLabel: "Before trim",
        inputValue: "  Bay A",
        outputLabel: "After trim",
        outputValue: "Bay A",
      },
      showPreview: true,
      joinStyle: "continuous-ribbon",
    },
  },
  {
    id: "whitespace",
    input: {
      title: "Fictional preparation recipe",
      steps: [
        {
          id: "read",
          label: "Read rows",
          isInserted: false,
        },
        {
          id: "trim",
          label: "Trim spaces",
          isInserted: true,
        },
        {
          id: "save",
          label: "Save result",
          isInserted: false,
        },
      ],
      editLabel: "Add an operation",
      preview: {
        inputLabel: "Before trim",
        inputValue: "  A\tB\nC  ",
        outputLabel: "After trim",
        outputValue: "A  B\tC\n",
      },
      showPreview: true,
      joinStyle: "tabbed",
    },
  },
];
/** Explicit malformed documents rejected by the strict runtime schema. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    steps: [
      { ...DEFAULT_INPUT.steps[0], id: "" },
      { ...DEFAULT_INPUT.steps[1], id: "" },
    ],
  },
  {},
  { ...DEFAULT_INPUT, unexpected: true },
  { ...DEFAULT_INPUT, steps: [] },
  { ...DEFAULT_INPUT, steps: [DEFAULT_INPUT.steps[0], DEFAULT_INPUT.steps[0]] },
  {
    ...DEFAULT_INPUT,
    steps: [
      { ...DEFAULT_INPUT.steps[0], unexpected: true },
      ...DEFAULT_INPUT.steps.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    steps: [
      { ...DEFAULT_INPUT.steps[0], id: "X".repeat(50) },
      ...DEFAULT_INPUT.steps.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    steps: DEFAULT_INPUT.steps.map((step) => ({ ...step, isInserted: false })),
  },
  {
    ...DEFAULT_INPUT,
    steps: DEFAULT_INPUT.steps.map((step) => ({ ...step, isInserted: true })),
  },
  {
    ...DEFAULT_INPUT,
    steps: DEFAULT_INPUT.steps.map((step, index) => ({
      ...step,
      isInserted: index === 0,
    })),
  },
  {
    ...DEFAULT_INPUT,
    steps: DEFAULT_INPUT.steps.map((step, index) => ({
      ...step,
      isInserted: index === DEFAULT_INPUT.steps.length - 1,
    })),
  },
  {
    ...DEFAULT_INPUT,
    preview: { ...DEFAULT_INPUT.preview, inputValue: "X".repeat(31) },
  },
  { ...DEFAULT_INPUT, joinStyle: "unknown" },
];
