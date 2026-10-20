import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./RepeatingBlocksToTable.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  fields: [
    {
      id: "action",
      label: "Action",
    },
    {
      id: "need",
      label: "Need",
    },
  ],
  blocks: [
    {
      id: "one",
      heading: "Site West",
      cells: [
        {
          fieldId: "action",
          text: "Repair tap",
        },
        {
          fieldId: "need",
          text: "Spare seal",
        },
      ],
    },
    {
      id: "two",
      heading: "Site East",
      cells: [
        {
          fieldId: "action",
          text: "Check pump",
        },
        {
          fieldId: "need",
          text: null,
        },
      ],
    },
  ],
  missingLabel: "Not stated",
  showBlockNumbers: true,
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  fields: [
    { id: "", label: "x" },
    { id: "n", label: "y" },
  ],
  blocks: [
    {
      id: "",
      heading: "Same",
      cells: [
        { fieldId: "n", text: null },
        { fieldId: "", text: null },
      ],
    },
    {
      id: "u",
      heading: "Same",
      cells: [
        { fieldId: "", text: "x" },
        { fieldId: "n", text: "y" },
      ],
    },
  ],
  showBlockNumbers: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  fields: ["a", "b", "c"].map((id) => ({
    id: id.repeat(12),
    label: "W".repeat(18),
  })),
  blocks: ["a", "b", "c"].map((id) => ({
    id: id.repeat(12),
    heading: "W".repeat(20),
    cells: ["c", "a", "b"].map((field) => ({
      fieldId: field.repeat(12),
      text: "W".repeat(26),
    })),
  })),
  missingLabel: "W".repeat(20),
  copy: {
    context: "W".repeat(34),
    source: "W".repeat(34),
    result: "W".repeat(34),
  },
};
const changed: Input = {
  ...DEFAULT_INPUT,
  fields: [...DEFAULT_INPUT.fields].reverse(),
  blocks: DEFAULT_INPUT.blocks.map((b) => ({
    ...b,
    cells: [...b.cells].reverse(),
  })),
  showBlockNumbers: false,
};
/** Complete default, empty-ID minimum, full-capacity and reordered examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
];
/**
 * Rejections include exact membership, duplicates and literal ID boundaries.
 */
export const invalidInputs: unknown[] = [
  undefined,
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, fields: [] },
  {
    ...DEFAULT_INPUT,
    fields: [DEFAULT_INPUT.fields[0], DEFAULT_INPUT.fields[0]],
  },
  {
    ...DEFAULT_INPUT,
    blocks: [DEFAULT_INPUT.blocks[0], DEFAULT_INPUT.blocks[0]],
  },
  {
    ...DEFAULT_INPUT,
    blocks: DEFAULT_INPUT.blocks.map((b) => ({ ...b, cells: [] })),
  },
  {
    ...DEFAULT_INPUT,
    blocks: DEFAULT_INPUT.blocks.map((b) => ({
      ...b,
      cells: [{ fieldId: "ghost", text: "x" }, b.cells[1]],
    })),
  },
  {
    ...DEFAULT_INPUT,
    blocks: DEFAULT_INPUT.blocks.map((b) => ({ ...b, id: "x".repeat(13) })),
  },
  {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((f) => ({ ...f, id: "x".repeat(13) })),
  },
  {
    ...DEFAULT_INPUT,
    blocks: DEFAULT_INPUT.blocks.map((b) => ({
      ...b,
      cells: b.cells.map((c) => ({ ...c, text: "" })),
    })),
  },
];
