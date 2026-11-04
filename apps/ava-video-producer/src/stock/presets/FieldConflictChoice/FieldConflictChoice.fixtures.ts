import type { Input } from "./FieldConflictChoice.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  recordTitle: "Fictional item record",
  sources: [
    {
      id: "register",
      label: "Register",
    },
    {
      id: "notes",
      label: "Review notes",
    },
  ],
  fields: [
    {
      id: "name",
      label: "Item name",
      candidates: [
        {
          sourceId: "register",
          value: "Label rolls",
        },
        {
          sourceId: "notes",
          value: "Labels",
        },
      ],
      chosenSourceId: "register",
    },
    {
      id: "location",
      label: "Location",
      candidates: [
        {
          sourceId: "register",
          value: "Bay A",
        },
        {
          sourceId: "notes",
          value: "Bay C",
        },
      ],
      chosenSourceId: null,
    },
  ],
  labels: {
    result: "Reconciled record",
    selected: "Selected",
    unresolved: "Needs review",
    alternatives: "Other supplied values",
  },
  showRetainedAlternatives: true,
  decisionStyle: "sliding-rail",
};
/** Boundary sources include empty references and maximum data values. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      recordTitle: "X",
      sources: [
        { id: "", label: "" },
        { id: " 二", label: "" },
      ],
      fields: [
        {
          id: "",
          label: "",
          candidates: [
            { sourceId: "", value: "" },
            { sourceId: " 二", value: "" },
          ],
          chosenSourceId: "",
        },
        {
          id: " 二",
          label: "",
          candidates: [
            { sourceId: "", value: "" },
            { sourceId: " 二", value: "" },
          ],
          chosenSourceId: null,
        },
      ],
      showRetainedAlternatives: false,
      decisionStyle: "selection-bracket",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      recordTitle: "W".repeat(42),
      sources: DEFAULT_INPUT.sources.map((source) => ({
        ...source,
        label: "W".repeat(26),
      })),
      fields: Array.from({ length: 4 }, (_, index) => ({
        id: `field ${index}`,
        label: "W".repeat(22),
        candidates: DEFAULT_INPUT.sources.map((source) => ({
          sourceId: source.id,
          value: "W".repeat(26),
        })),
        chosenSourceId:
          index === 3 ? null : DEFAULT_INPUT.sources[index % 2].id,
      })),
      labels: {
        result: "W".repeat(28),
        selected: "W".repeat(28),
        unresolved: "W".repeat(28),
        alternatives: "W".repeat(28),
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      fields: DEFAULT_INPUT.fields.map((field) => ({
        ...field,
        chosenSourceId: "notes",
      })),
      showRetainedAlternatives: false,
      decisionStyle: "selection-bracket",
    },
  },
];
/** Missing source coverage, duplicate identities and invalid choices fail. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    sources: [DEFAULT_INPUT.sources[0], DEFAULT_INPUT.sources[0]],
  },
  { ...DEFAULT_INPUT, fields: [] },
  {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((field) => ({
      ...field,
      chosenSourceId: "absent",
    })),
  },
  {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((field) => ({
      ...field,
      candidates: [field.candidates[0], field.candidates[0]],
    })),
  },
  {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((field) => ({
      ...field,
      candidates: [{ sourceId: "absent", value: "" }, field.candidates[1]],
    })),
  },
  { ...DEFAULT_INPUT, recordTitle: "" },
];
