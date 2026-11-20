import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The dash of an acknowledgement box left unticked; no theme step draws it. */
const UNACKNOWLEDGED_DASH = "2 2";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  if (kind === "acknowledgement") {
    return (
      <StockRect
        x={x - 4}
        y={y - 5}
        width={9}
        height={10}
        fill={value ? accent : "none"}
        stroke={tokens.color.text}
        strokeDasharray={value ? undefined : UNACKNOWLEDGED_DASH}
      />
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <SketchedShape
        shape={{ kind: "path", d: _buildFactMarkPath({ kind, value }) }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={
          value === "logged" || value === "intact"
            ? accent
            : tokens.color.highlight
        }
        strokeDasharray={
          value === "unknown" ? atomic.dash.dot.join(" ") : undefined
        }
      />
    </g>
  );
}
/**
 * A monitoring fact as a square, triangle, or dash; a seal as a diamond, or
 * two jagged halves once broken.
 */
function _buildFactMarkPath({
  kind,
  value,
}: Readonly<{ kind: "monitoring" | "seal"; value: string }>): string {
  if (kind === "monitoring") {
    return value === "logged"
      ? "M-5 -5 h10 v10 h-10 Z"
      : value === "review"
        ? "M0 -6 l6 11 h-12 Z"
        : "M-5 0 h10";
  }
  return value === "broken"
    ? "M-4 -5 l4 4 -4 2 4 4 M4 -5 l-4 4 4 2 -4 4"
    : "M0 -6 l6 6 -6 6 -6 -6 Z";
}
