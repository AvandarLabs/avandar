import type { Input } from "./ReportPageBind.schema";
/** Complete fictional fallback used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  reportTitle: "Fictional supply brief",
  sections: [
    {
      id: "inventory",
      heading: "Inventory",
      body: "Sample stock includes paper and labels.",
    },
    {
      id: "review",
      heading: "Review notes",
      body: "Counts are fictional and provided for the example.",
    },
  ],
  byline: "Example planning team",
  destinationLabel: "Team reading tray",
  formatLabel: "PDF",
  finalView: "stack",
  showPageNumbers: true,
};
/** Minimum, dense, changed and data-boundary cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      reportTitle: "A",
      sections: [
        {
          id: "",
          heading: "",
          body: "",
        },
        {
          id: "item-1",
          heading: "",
          body: "",
        },
      ],
      byline: "",
      destinationLabel: "A",
      formatLabel: "A",
      finalView: "stack",
      showPageNumbers: false,
    },
  },
  {
    id: "dense",
    input: {
      reportTitle: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      sections: [
        {
          id: "item-0",
          heading: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          body: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-1",
          heading: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          body: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-2",
          heading: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          body: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      byline: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      destinationLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      formatLabel: "WWWWWWWWWW",
      finalView: "stack",
      showPageNumbers: true,
    },
  },
  {
    id: "changed",
    input: {
      reportTitle: "Fictional map situation report",
      sections: [
        {
          id: "map",
          heading: "Map view",
          body: "Example units, geography and observation.",
        },
        {
          id: "legend",
          heading: "Classification legend",
          body: "The supplied legend stays with its map.",
        },
        {
          id: "source",
          heading: "Source and limitation",
          body: "Fictional attribution and limitation note.",
        },
      ],
      byline: "Example planning team",
      destinationLabel: "Team reading tray",
      formatLabel: "PDF",
      finalView: "spread",
      showPageNumbers: true,
    },
  },
];
/** Explicit malformed documents rejected by the strict runtime schema. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    sections: [
      { ...DEFAULT_INPUT.sections[0], id: "" },
      { ...DEFAULT_INPUT.sections[1], id: "" },
    ],
  },
  {},
  { ...DEFAULT_INPUT, unexpected: true },
  { ...DEFAULT_INPUT, sections: [] },
  {
    ...DEFAULT_INPUT,
    sections: [DEFAULT_INPUT.sections[0], DEFAULT_INPUT.sections[0]],
  },
  {
    ...DEFAULT_INPUT,
    sections: [
      { ...DEFAULT_INPUT.sections[0], unexpected: true },
      ...DEFAULT_INPUT.sections.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    sections: [
      { ...DEFAULT_INPUT.sections[0], id: "X".repeat(50) },
      ...DEFAULT_INPUT.sections.slice(1),
    ],
  },
  { ...DEFAULT_INPUT, reportTitle: "X".repeat(45) },
  {
    ...DEFAULT_INPUT,
    sections: [
      { ...DEFAULT_INPUT.sections[0], body: "X".repeat(91) },
      DEFAULT_INPUT.sections[1],
    ],
  },
  { ...DEFAULT_INPUT, finalView: "unknown" },
];
