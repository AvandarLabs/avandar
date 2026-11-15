import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ProseMeasurementLedger.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  fragments: [
    {
      id: "a",
      text: "West site reported ",
      role: "subject",
      contentStart: 0,
      contentEnd: 9,
    },
    {
      id: "b",
      text: "about ",
      role: "qualifier",
      contentStart: 0,
      contentEnd: 5,
    },
    {
      id: "c",
      text: "12 ",
      role: "value",
      contentStart: 0,
      contentEnd: 2,
    },
    {
      id: "d",
      text: "crates ",
      role: "unit",
      contentStart: 0,
      contentEnd: 6,
    },
    {
      id: "e",
      text: "received ",
      role: "metric",
      contentStart: 0,
      contentEnd: 8,
    },
    {
      id: "f",
      text: "in week 2.",
      role: "period",
      contentStart: 3,
      contentEnd: 9,
    },
  ],
  showSourceSpans: true,
  method: "rules",
  reviewState: "needs-review",
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  fragments: DEFAULT_INPUT.fragments.map((fragment, index) => ({
    ...fragment,
    text: index === 2 ? "0" : "x",
    contentStart: 0,
    contentEnd: 1,
  })),
  showSourceSpans: false,
  method: "model-assisted",
  reviewState: "reviewed",
};
const dense: Input = {
  ...DEFAULT_INPUT,
  fragments: [
    ...DEFAULT_INPUT.fragments.map((fragment, index) => ({
      ...fragment,
      text: index === 2 ? "-0.00000000000000001" : "W".repeat(16),
      contentStart: 0,
      contentEnd: index === 2 ? 20 : 16,
    })),
    { id: "g", role: "connector", text: " ", contentStart: 0, contentEnd: 0 },
    { id: "h", role: "connector", text: " ", contentStart: 0, contentEnd: 0 },
    { id: "i", role: "connector", text: " ", contentStart: 0, contentEnd: 0 },
  ],
  copy: {
    context: "W".repeat(34),
    source: "W".repeat(34),
    result: "W".repeat(34),
  },
};
const changed: Input = {
  ...DEFAULT_INPUT,
  fragments: DEFAULT_INPUT.fragments.map((fragment) =>
    fragment.role === "subject" ? { ...fragment, contentEnd: 4 } : fragment,
  ),
  method: "model-assisted",
  showSourceSpans: false,
};
/** Minimum, dense and altered semantic input documents. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
];
/** Rejected shape, role, span and numeric documents. */
export const invalidInputs: unknown[] = [
  undefined,
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, fragments: [] },
  {
    ...DEFAULT_INPUT,
    fragments: [...DEFAULT_INPUT.fragments, DEFAULT_INPUT.fragments[0]],
  },
  {
    ...DEFAULT_INPUT,
    fragments: DEFAULT_INPUT.fragments.map((f) =>
      f.role === "subject" ? { ...f, role: "metric" } : f,
    ),
  },
  {
    ...DEFAULT_INPUT,
    fragments: DEFAULT_INPUT.fragments.map((f) => ({ ...f, contentStart: -1 })),
  },
  {
    ...DEFAULT_INPUT,
    fragments: DEFAULT_INPUT.fragments.map((f) => ({ ...f, contentEnd: 99 })),
  },
  ...["1e3", "1,000", "NaN", "Infinity", " "].map((text) => ({
    ...DEFAULT_INPUT,
    fragments: DEFAULT_INPUT.fragments.map((f) =>
      f.role === "value"
        ? { ...f, text, contentStart: 0, contentEnd: text.length }
        : f,
    ),
  })),
  {
    ...DEFAULT_INPUT,
    fragments: [
      ...DEFAULT_INPUT.fragments,
      {
        id: "z",
        role: "connector",
        text: "and",
        contentStart: 0,
        contentEnd: 1,
      },
    ],
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, source: "x".repeat(35) } },
];
