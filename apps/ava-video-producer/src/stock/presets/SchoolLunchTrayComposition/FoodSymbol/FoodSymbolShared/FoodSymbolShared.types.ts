import type { Input } from "../../SchoolLunchTrayComposition.schema";
/** Inputs shared by the FoodSymbol visuals. */
export type Props = {
  symbol: Input["plannedComponents"][number]["symbol"];
  color: string;
};
