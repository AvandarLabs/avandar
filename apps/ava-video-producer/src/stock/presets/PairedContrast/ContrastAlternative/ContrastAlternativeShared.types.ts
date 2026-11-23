import type { Input } from "../PairedContrast.schema";
/** Inputs shared by the ContrastAlternative visuals. */
export type Props = {
  frame: number;
  accent: string;
  alternative: Input["alternatives"][number];
  index: number;
};
