import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LeaseSocketShared } from "./LeaseSocketShared/LeaseSocketShared";
import type { ReactNode } from "react";
/** The socket's ring, its outline opening by `opening` at expiry. */
export function SocketRing({
  x,
  y,
  opening,
}: Readonly<{ x: number; y: number; opening: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "circle", cx: x, cy: y, r: 32 }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.accentAlt}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      pathLength={LeaseSocketShared.SOCKET_LENGTH}
      strokeDasharray={LeaseSocketShared.SOCKET_LENGTH}
      strokeDashoffset={
        LeaseSocketShared.SOCKET_LENGTH * opening * LeaseSocketShared.OPEN_GAP
      }
    />
  );
}
