import { STOCK } from "../../stockPalette";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";
type Props = { kind: Input["expenses"][number]["object"]; color: string };
const OBJECT_PATHS: Record<
  "book" | "ticket" | "clothing" | "meal" | "fee-slip",
  string
> = {
  book: "M-25 -21 H-3 L0 -17 L3 -21 H25 V21 H3 L0 25 L-3 21 H-25 Z M0 -17 V25 M-19 -12 H-7 M7 -12 H19",
  ticket: "M-29 -15 H29 V-5 Q18 0 29 5 V15 H-29 V5 Q-18 0 -29 -5 Z M12 -15 V15",
  clothing:
    "M-12 -23 L-30 -10 L-20 3 L-12 -2 V25 H12 V-2 L20 3 L30 -10 L12 -23 Q0 -10 -12 -23 Z",
  meal: "M-28 -5 H28 Q23 24 0 24 Q-23 24 -28 -5 Z M-30 -10 H30 M-12 -27 V-17 M0 -31 V-17 M12 -27 V-17",
  "fee-slip":
    "M-20 -28 H20 V28 L10 22 L0 28 L-10 22 L-20 28 Z M-12 -16 H12 M-12 -5 H12 M-12 6 H5",
};
/** Five distinct silhouettes correspond exactly to authored expense kinds. */
export function ExpenseObject({ kind, color }: Readonly<Props>): ReactNode {
  return (
    <path
      data-expense-shape={kind}
      d={OBJECT_PATHS[kind]}
      fill={STOCK.surface}
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}
