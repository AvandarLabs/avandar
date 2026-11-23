import type { Input } from "../FilterSubscriptionScope.schema";
/** Inputs shared by the SubscriptionFrame visuals. */
export type Props = {
  view: Input["views"][number];
  x: number;
  width: number;
  accent: string;
};
