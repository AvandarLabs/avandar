import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";
type Props = {
  state: Input["participants"][number]["records"][number]["state"];
  x: number;
  y: number;
  color: string;
};
/** Distinct record symbols shared by the attendance fabric and its legend. */
export function VisitMark({ state, x, y, color }: Readonly<Props>): ReactNode {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d={
        state === "recorded"
          ? "M-6 0 l4 4 8 -9"
          : state === "missed"
            ? "M-5 -5 l10 10 M-5 5 l10 -10"
            : state === "not-due"
              ? "M-5 -5 h10 l-10 10 h10 Z"
              : "M-5 -3 q5 -7 10 0 q0 4 -5 5 M0 5 v2"
      }
      fill="none"
      stroke={color}
    />
  );
}
