import type { getCasePositionsFromInput } from "../getCasePositionsFromInput";
/** Inputs shared by the TravelingCase visuals. */
export type Props = {
  position: ReturnType<typeof getCasePositionsFromInput>[number];
  frame: number;
  accent: string;
  showGuide: boolean;
};
