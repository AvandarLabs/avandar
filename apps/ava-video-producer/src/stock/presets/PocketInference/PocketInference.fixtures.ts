import type { Input } from "./PocketInference.schema";
/** Literal authored rewrite, never executed model output. */
export const DEFAULT_INPUT: Input = {
  model: { label: "Example pocket model", detail: "Installed example" },
  input: {
    label: "Example instruction",
    text: "Shorten: Meet at the blue shed at noon.",
  },
  response: { label: "Authored example response", lines: ["Blue shed, noon."] },
  copy: {
    device: "Example tablet",
    boundary: "Illustrated work stays here",
    example: "Fictional example",
  },
  deviceShape: "tablet",
  showCutaway: true,
  showLabels: true,
};
/**
 * Empty optional detail, maximum text, and an illustrative local SQL response.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      model: { label: "M", detail: "" },
      input: { label: "I", text: "Q" },
      response: { label: "R", lines: ["A"] },
      deviceShape: "phone",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      model: { label: "W".repeat(28), detail: "W".repeat(28) },
      input: { label: "W".repeat(24), text: "W".repeat(96) },
      response: { label: "W".repeat(32), lines: Array(3).fill("W".repeat(44)) },
      copy: {
        device: "W".repeat(34),
        boundary: "W".repeat(34),
        example: "W".repeat(34),
      },
      deviceShape: "phone",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      response: {
        label: "Illustrative query, not executed",
        lines: [
          "SELECT label FROM example_notes;",
          "Authored SQL example only",
        ],
      },
      deviceShape: "laptop",
      showCutaway: false,
    },
  },
];
/**
 * Incomplete documents, extra fields, and every collection/text boundary are
 * rejected.
 */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, model: { ...DEFAULT_INPUT.model, extra: true } },
  {
    ...DEFAULT_INPUT,
    model: { ...DEFAULT_INPUT.model, label: "W".repeat(29) },
  },
  { ...DEFAULT_INPUT, input: { ...DEFAULT_INPUT.input, text: "W".repeat(97) } },
  { ...DEFAULT_INPUT, response: { ...DEFAULT_INPUT.response, lines: [] } },
  {
    ...DEFAULT_INPUT,
    response: { ...DEFAULT_INPUT.response, lines: Array(4).fill("A") },
  },
  {
    ...DEFAULT_INPUT,
    response: { ...DEFAULT_INPUT.response, lines: ["W".repeat(45)] },
  },
  { ...DEFAULT_INPUT, deviceShape: "watch" },
];
