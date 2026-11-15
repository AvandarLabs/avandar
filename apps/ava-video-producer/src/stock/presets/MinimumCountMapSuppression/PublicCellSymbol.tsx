import { STOCK } from "../../stockPalette";
import type { makePublicCellsFromInput } from "./makePublicCellsFromInput";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";

type Props = {
  status: ReturnType<typeof makePublicCellsFromInput>[number]["status"];
  labels: Input["labels"];
  x: number;
  y: number;
};
/** Distinct graphical states carry only permitted accessible public copy. */
export function PublicCellSymbol({
  status,
  labels,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return status === "suppressed" ? (
    <path
      aria-label={labels.suppressed}
      d={`M${x + 68} ${y + 62} l34 18 M${x + 102} ${y + 62} l-34 18 M${x + 70} ${y + 60} v24 M${x + 80} ${y + 60} v24 M${x + 90} ${y + 60} v24 M${x + 100} ${y + 60} v24`}
      stroke={STOCK.orange}
    />
  ) : status === "missing" ? (
    <path
      aria-label={labels.missing}
      d={`M${x + 72} ${y + 76} h26`}
      stroke={STOCK.muted}
      strokeWidth={3}
    />
  ) : status === "zero" ? (
    <circle
      aria-label={labels.zero}
      cx={x + 85}
      cy={y + 76}
      r={10}
      fill="none"
      stroke={STOCK.muted}
    />
  ) : undefined;
}
