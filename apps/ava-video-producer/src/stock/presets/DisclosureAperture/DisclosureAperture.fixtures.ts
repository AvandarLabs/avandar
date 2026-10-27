import type { Input } from "./DisclosureAperture.schema";
/** Complete fictional source with an explicit share choice on each field. */
export const DEFAULT_INPUT: Input = {
  fields: [
    {
      id: "topic",
      label: "Example topic",
      value: "Shed visit",
      disclosure: "share",
    },
    {
      id: "note",
      label: "Example note",
      value: "Blue crate",
      disclosure: "retain",
    },
    {
      id: "tag",
      label: "Example tag",
      value: "Follow up",
      disclosure: "share",
    },
  ],
  copy: {
    source: "Example local notebook",
    boundary: "Example sharing boundary",
    destination: "Example shared excerpt",
    retain: "Stays in notebook",
    share: "Included in excerpt",
    example: "Fictional example",
  },
  direction: "left-to-right",
  showPolicyMarks: true,
  showValues: true,
  showLabels: true,
};
/**
 * Empty upper-only fields, maximum collection, and metadata-versus-content
 * binding.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      fields: [{ id: "", label: "", value: "", disclosure: "retain" }],
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      fields: Array.from({ length: 5 }, (_, index) => ({
        id: `field-${index}`,
        label: "W".repeat(22),
        value: "W".repeat(28),
        disclosure: "share",
      })),
      copy: Object.fromEntries(
        Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "W".repeat(32)]),
      ) as Input["copy"],
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      fields: [
        {
          id: "metadata α",
          label: "Dataset metadata",
          value: "Example schema summary",
          disclosure: "share",
        },
        {
          id: "bytes β",
          label: "Raw file contents",
          value: "Retained local source bytes",
          disclosure: "retain",
        },
      ],
      direction: "right-to-left",
    },
  },
];
/**
 * No extra keys, duplicate identities or unknown policy values are accepted.
 */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, fields: [] },
  { ...DEFAULT_INPUT, fields: Array(6).fill(DEFAULT_INPUT.fields[0]) },
  {
    ...DEFAULT_INPUT,
    fields: [DEFAULT_INPUT.fields[0], DEFAULT_INPUT.fields[0]],
  },
  {
    ...DEFAULT_INPUT,
    fields: [{ ...DEFAULT_INPUT.fields[0], disclosure: "redact" }],
  },
  {
    ...DEFAULT_INPUT,
    fields: [{ ...DEFAULT_INPUT.fields[0], id: "W".repeat(17) }],
  },
  {
    ...DEFAULT_INPUT,
    fields: [{ ...DEFAULT_INPUT.fields[0], label: "W".repeat(23) }],
  },
  {
    ...DEFAULT_INPUT,
    fields: [{ ...DEFAULT_INPUT.fields[0], value: "W".repeat(29) }],
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
  { ...DEFAULT_INPUT, direction: "up" },
];
