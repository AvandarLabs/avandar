import type { Input } from "./ExceptionDetour.schema";
/** Complete fictional content, used only for an omitted entire input. */
export const DEFAULT_INPUT: Input = {
  rule: {
    label: "Return borrowed tools to the shelf",
    outcome: "Tool shelf",
  },
  exception: {
    condition: "A part is loose",
    outcome: "Repair tray",
  },
  caseLabel: "Fictional loose-handled brush",
  pathLabels: {
    standard: "Usually",
    exception: "Except when",
  },
  showStandardReference: true,
  detourSide: "below",
};
/** Reproducible accepted collection and text-boundary variants. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      rule: {
        label: "R",
        outcome: "S",
      },
      exception: {
        condition: "E",
        outcome: "X",
      },
      caseLabel: "C",
      pathLabels: {
        standard: "S",
        exception: "E",
      },
      showStandardReference: false,
      detourSide: "above",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      rule: {
        label:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        outcome: "界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      exception: {
        condition:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        outcome: "界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      caseLabel:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      pathLabels: {
        standard: "界界界界界界界界界界界界界界界界界界",
        exception: "界界界界界界界界界界界界界界界界界界",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      exception: {
        condition: "A crack is visible",
        outcome: "Inspection table",
      },
      caseLabel: "Fictional cracked bowl",
      showStandardReference: false,
      detourSide: "above",
    },
  },
];
/** Strict keys, text bounds, collection limits, and membership rejections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, rule: null },
  {
    ...DEFAULT_INPUT,
    rule: {
      label: "Return borrowed tools to the shelf",
      outcome: "Tool shelf",
      extra: true,
    },
  },
  {
    ...DEFAULT_INPUT,
    exception: {
      condition: "A part is loose",
      outcome: "Repair tray",
      extra: true,
    },
  },
  { ...DEFAULT_INPUT, caseLabel: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  {
    ...DEFAULT_INPUT,
    pathLabels: {
      standard: "Usually",
      exception: "Except when",
      extra: true,
    },
  },
  { ...DEFAULT_INPUT, detourSide: "unknown" },
  {
    ...DEFAULT_INPUT,
    rule: {
      label:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      outcome: "Tool shelf",
    },
  },
  {
    ...DEFAULT_INPUT,
    rule: {
      label: "Return borrowed tools to the shelf",
      outcome: "界界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    ...DEFAULT_INPUT,
    exception: {
      condition:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      outcome: "Repair tray",
    },
  },
  {
    ...DEFAULT_INPUT,
    exception: {
      condition: "A part is loose",
      outcome: "界界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    ...DEFAULT_INPUT,
    pathLabels: {
      standard: "界界界界界界界界界界界界界界界界界界界",
      exception: "Except when",
    },
  },
  {
    ...DEFAULT_INPUT,
    pathLabels: {
      standard: "Usually",
      exception: "界界界界界界界界界界界界界界界界界界界",
    },
  },
];
