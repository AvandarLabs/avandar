import type { Input } from "./SealedHandoff.schema";
/** Fictional brief and deliberately visible exterior routing information. */
export const DEFAULT_INPUT: Input = {
  brief: [
    { id: "line-a", line: "Example meeting: blue shed" },
    { id: "line-b", line: "Example topic: crate labels" },
  ],
  address: {
    sender: "Example author",
    recipient: "Example coordinator",
    reference: "Example brief A",
  },
  copy: {
    contents: "Example brief contents",
    covered: "Contents covered",
    received: "Received, still sealed",
    opened: "Opened by recipient",
    example: "Fictional physical metaphor",
  },
  revealRule: "recipient",
  showExteriorReference: true,
  showLabels: true,
};
/**
 * Complete collection extremes and a handoff that intentionally stays sealed.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      brief: [{ id: "", line: "A" }],
      revealRule: "remain-sealed",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      brief: Array.from({ length: 4 }, (_, index) => ({
        id: `line-${index}`,
        line: "W".repeat(36),
      })),
      address: {
        sender: "W".repeat(28),
        recipient: "W".repeat(28),
        reference: "W".repeat(28),
      },
      copy: Object.fromEntries(
        Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "W".repeat(34)]),
      ) as Input["copy"],
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      brief: [
        { id: "draft α", line: "Authored private rehearsal notes" },
        { id: "agenda β", line: "Example agenda stays covered" },
      ],
      address: {
        sender: "Fictional author",
        recipient: "Fictional reviewer",
        reference: "Review copy C",
      },
      revealRule: "remain-sealed",
    },
  },
];
/**
 * Strict authored documents reject incomplete, oversized and duplicated brief
 * content.
 */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, brief: [] },
  { ...DEFAULT_INPUT, brief: Array(5).fill(DEFAULT_INPUT.brief[0]) },
  { ...DEFAULT_INPUT, brief: [DEFAULT_INPUT.brief[0], DEFAULT_INPUT.brief[0]] },
  { ...DEFAULT_INPUT, brief: [{ id: "a", line: "" }] },
  { ...DEFAULT_INPUT, brief: [{ id: "a", line: "W".repeat(37) }] },
  {
    ...DEFAULT_INPUT,
    address: { ...DEFAULT_INPUT.address, reference: "W".repeat(29) },
  },
  { ...DEFAULT_INPUT, address: { ...DEFAULT_INPUT.address, extra: true } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
  { ...DEFAULT_INPUT, revealRule: "during-transit" },
];
