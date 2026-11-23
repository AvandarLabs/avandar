import type { Input } from "../../CarbonStorageAccounting.schema";
/** Inputs shared by the OperatingEmissionRow visuals. */
export type Props = {
  row: Input["operatingEmissions"][number];
  index: number;
  unit: string;
  frame: number;
};
