import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SketchedShape } from "../SketchedShape";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  membership: "included" | "excluded" | "unknown";
  /** Defaults to the theme's positive colour. */
  color?: string;
};
const MEMBERSHIP_PATHS: {
  included: string;
  excluded: string;
  unknown: string;
} = {
  included: "M-5 0 L-1 4 L6 -5",
  excluded: "M-4 -4 L4 4 M-4 4 L4 -4",
  unknown: "M-4 0 H4",
};

/**
 * Draws explicit membership state without determining eligibility or grants.
 */
export function MembershipMarker({
  x,
  y,
  membership,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  if (![x, y].every(Number.isFinite) || !(membership in MEMBERSHIP_PATHS)) {
    throw new Error(
      "Membership markers require finite placement and an explicit supported state.",
    );
  }
  const stroke =
    membership === "included"
      ? (color ?? tokens.color.positive)
      : tokens.color.inactive;
  return (
    <g transform={`translate(${x} ${y})`}>
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: 11 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={stroke}
      />
      <SketchedShape
        shape={{ kind: "path", d: MEMBERSHIP_PATHS[membership] }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={stroke}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
