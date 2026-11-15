import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { x: number; y: number; accent: string } & (
  | { kind: "monitoring"; value: "logged" | "review" | "missing" }
  | { kind: "acknowledgement"; value: boolean }
  | { kind: "seal"; value: "intact" | "broken" | "unknown" }
);
/** Identical checkpoint and legend symbols keep independent facts legible. */
export function CustodyFactMark({
  x,
  y,
  accent,
  kind,
  value,
}: Readonly<Props>): ReactNode {
  if (kind === "acknowledgement") {
    return (
      <rect
        x={x - 4}
        y={y - 5}
        width={9}
        height={10}
        fill={value ? accent : "none"}
        stroke={STOCK.text}
        strokeDasharray={value ? undefined : "2 2"}
      />
    );
  }
  const path =
    kind === "monitoring"
      ? value === "logged"
        ? "M-5 -5 h10 v10 h-10 Z"
        : value === "review"
          ? "M0 -6 l6 11 h-12 Z"
          : "M-5 0 h10"
      : value === "broken"
        ? "M-4 -5 l4 4 -4 2 4 4 M4 -5 l-4 4 4 2 -4 4"
        : "M0 -6 l6 6 -6 6 -6 -6 Z";
  return (
    <path
      transform={`translate(${x} ${y})`}
      d={path}
      fill="none"
      stroke={value === "logged" || value === "intact" ? accent : STOCK.orange}
      strokeDasharray={value === "unknown" ? "2 3" : undefined}
    />
  );
}
