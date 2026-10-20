import type { Input } from "./RecurringLeakPrevention.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  fixtureLabel: "Illustrative joint",
  workerLabel: "Maintenance partner",
  repair: { label: "Replace the joint seal", gesture: "replace-seal" },
  retest: "stopped",
  labels: {
    containment: "Temporary containment",
    repair: "Source repair",
    test: "Illustrated retest",
    stopped: "No leak observed",
    continued: "Leak still observed",
    untested: "Not retested",
    example: "Fictional system metaphor",
  },
  showPhaseCaptions: true,
};
/**
 * Minimum, maximum-density and changed semantics exercise authored variants.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      fixtureLabel: "A",
      workerLabel: "B",
      repair: { label: "A", gesture: "tighten" },
      retest: "not-tested",
      labels: {
        containment: "T",
        repair: "S",
        test: "I",
        stopped: "N",
        continued: "L",
        untested: "N",
        example: "F",
      },
      showPhaseCaptions: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      fixtureLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      workerLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      repair: {
        ...DEFAULT_INPUT.repair,
        label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      labels: {
        containment: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        repair: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        test: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        stopped: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        continued: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        untested: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      repair: { label: "Tighten the joint", gesture: "tighten" },
      retest: "still-leaking",
      showPhaseCaptions: false,
    },
  },
];
/** Rejection documents preserve all unaffected input fields. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, retest: "success" },
  { ...DEFAULT_INPUT, repair: { label: "Repair", gesture: "close-supply" } },
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, fixtureLabel: "" },
  {
    ...DEFAULT_INPUT,
    fixtureLabel:
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  { ...DEFAULT_INPUT, workerLabel: "" },
  {
    ...DEFAULT_INPUT,
    workerLabel:
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  { ...DEFAULT_INPUT, repair: { ...DEFAULT_INPUT.repair, extra: true } },
  { ...DEFAULT_INPUT, repair: { ...DEFAULT_INPUT.repair, label: "" } },
  {
    ...DEFAULT_INPUT,
    repair: {
      ...DEFAULT_INPUT.repair,
      label:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, repair: { ...DEFAULT_INPUT.repair, gesture: "INVALID" } },
  { ...DEFAULT_INPUT, retest: "INVALID" },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, containment: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      containment:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, repair: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      repair:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, test: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      test: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, stopped: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      stopped:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, continued: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      continued:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, untested: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      untested:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, showPhaseCaptions: "true" },
];
