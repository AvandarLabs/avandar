import { STOCK } from "../../stockPalette";
import type { StockContract } from "../../contracts/StockContract.types";
import type { CodeFocusInput } from "./CodeFocus.schema";

/** Complete fictional example used only when input is omitted. */
export const codeFocusDefaultInput: CodeFocusInput = {
  lines: [
    [
      { text: "const", color: STOCK.cyan },
      { text: " connect = ", color: STOCK.text },
      { text: "async", color: STOCK.cyan },
      { text: " (source) => {", color: STOCK.text },
    ],
    [
      { text: "  const", color: STOCK.cyan },
      { text: " rows = ", color: STOCK.text },
      { text: "await", color: STOCK.cyan },
      { text: " read(source);", color: STOCK.text },
    ],
    [
      { text: "  const", color: STOCK.cyan },
      { text: " clean = rows.", color: STOCK.text },
      { text: "map", color: STOCK.mint },
      { text: "(normalize);", color: STOCK.text },
    ],
    [
      { text: "  const", color: STOCK.cyan },
      { text: " ready = clean.", color: STOCK.text },
      { text: "filter", color: STOCK.mint },
      { text: "(isValid);", color: STOCK.text },
    ],
    [
      { text: "  return", color: STOCK.cyan },
      { text: " { status: ", color: STOCK.text },
      { text: '"ready"', color: STOCK.orange },
      { text: ", rows: ready };", color: STOCK.text },
    ],
    [{ text: "};", color: STOCK.text }],
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
  lines: [[{ text: "const approved = true;", color: STOCK.cyan }]],
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
