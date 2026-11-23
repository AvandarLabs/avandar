import type { Input } from "../BenefitShortfallCorrection.schema";
/** Inputs shared by the PaymentTray visuals. */
export type Props = {
  payment: Input["payments"][number];
  frame: number;
  index: number;
  accent: string;
};
