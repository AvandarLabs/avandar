import type { StockContract } from "../../contracts/StockContract.types";
import type { CodeFocusInput } from "./CodeFocus.schema";

/** Complete fictional example used only when input is omitted. */
export const codeFocusDefaultInput: CodeFocusInput = {
  lines: [
    [
      { text: "const", color: "$color.accentAlt" },
      { text: " connect = ", color: "$color.text" },
      { text: "async", color: "$color.accentAlt" },
      { text: " (source) => {", color: "$color.text" },
    ],
    [
      { text: "  const", color: "$color.accentAlt" },
      { text: " rows = ", color: "$color.text" },
      { text: "await", color: "$color.accentAlt" },
      { text: " read(source);", color: "$color.text" },
    ],
    [
      { text: "  const", color: "$color.accentAlt" },
      { text: " clean = rows.", color: "$color.text" },
      { text: "map", color: "$color.accent" },
      { text: "(normalize);", color: "$color.text" },
    ],
    [
      { text: "  const", color: "$color.accentAlt" },
      { text: " ready = clean.", color: "$color.text" },
      { text: "filter", color: "$color.accent" },
      { text: "(isValid);", color: "$color.text" },
    ],
    [
      { text: "  return", color: "$color.accentAlt" },
      { text: " { status: ", color: "$color.text" },
      { text: '"ready"', color: "$color.highlight" },
      { text: ", rows: ready };", color: "$color.text" },
    ],
    [{ text: "};", color: "$color.text" }],
  ],
  highlight: [1, 2, 3, 4],
  title: "transform.example.ts",
  footer: "Read → normalize → validate → return",
  showHighlight: true,
};

/** The maximum supported collection density in the authored layout. */
export const codeFocusDenseInput: CodeFocusInput = { ...codeFocusDefaultInput };

/** A complete smaller or differently selected authored example. */
export const codeFocusChangedInput: CodeFocusInput = {
  ...codeFocusDefaultInput,
  lines: [[{ text: "const approved = true;", color: "$color.accentAlt" }]],
  highlight: [0],
  title: "authored.example.ts",
  footer: "Authored code example",
  showHighlight: false,
};

/** Named examples available to editors and semantic regression checks. */
export const codeFocusFixtures: StockContract<
  typeof codeFocusDefaultInput
>["fixtures"] = [
  { id: "default", input: codeFocusDefaultInput },
  { id: "dense", input: codeFocusDenseInput },
  { id: "changed", input: codeFocusChangedInput },
];
