import type { Input } from "../DoseCohortReturnPaths.schema";
/** Inputs shared by the CohortRecord visuals. */
export type Props = {
  input: Input;
  participant: Input["participants"][number];
  visit: Input["visits"][number];
  visitIndex: number;
  personIndex: number;
  y: number;
  frame: number;
  accent: string;
};
