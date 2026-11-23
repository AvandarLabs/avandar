import { getCasePositionsFromInput } from "../getCasePositionsFromInput";
/** Inputs shared by the HistogramSegments visuals. */
export type CaseProps = Readonly<{
  position: ReturnType<typeof getCasePositionsFromInput>[number];
  frame: number;
  accent: string;
}>;
