import type { StockContract } from "../../contracts/StockContract.types";
import type { TerminalTypeInput } from "./TerminalType.schema";

/** Complete fictional example used only when input is omitted. */
export const TERMINAL_TYPE_DEFAULT_INPUT: TerminalTypeInput = {
  command: "sample run --input records.csv",
  steps: [
    { text: "Read sample records", detail: "01" },
    { text: "Apply example rules", detail: "02" },
    { text: "Prepare sample output", detail: "03" },
  ],
  response: "Done. 3 example stages completed.",
  title: "terminal · conceptual example",
  showCaret: true,
};

/** The maximum supported collection density in the authored layout. */
export const terminalTypeDenseInput: TerminalTypeInput = {
  ...TERMINAL_TYPE_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const terminalTypeChangedInput: TerminalTypeInput = {
  ...TERMINAL_TYPE_DEFAULT_INPUT,
  command: "example validate",
  steps: [{ text: "Check authored input", detail: "01" }],
  response: "Done. Authored input checked.",
  title: "Authored terminal",
  showCaret: false,
};

/** Named examples available to editors and semantic regression checks. */
export const terminalTypeFixtures: StockContract<
  typeof TERMINAL_TYPE_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: TERMINAL_TYPE_DEFAULT_INPUT },
  { id: "dense", input: terminalTypeDenseInput },
  { id: "changed", input: terminalTypeChangedInput },
];
