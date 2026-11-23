import type { Input } from "../ArgumentBridge.schema";
/** Inputs for PremiseSupport. */
export type Props = {
  joining: number;
  center: number;
  x: number;
  slotWidth: number;
  accent: string;
  premise: Input["premises"][number];
  showSupport: boolean;
  relationship: Input["relationship"];
};
