import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BufferCompassShared } from "./BufferCompassShared/BufferCompassShared";
import type { ReactNode } from "react";

type Props = {
  arm: ReturnType<typeof BufferCompassShared.getCompassGeometry>["arm"];
  frame: number;
  accent: string;
};

/** The compass arm, shown while it sweeps and faded once the circle closes. */
export function CompassArm({ arm, frame, accent }: Readonly<Props>): ReactNode {
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <SketchedShape
      data-compass-arm=""
      shape={{ kind: "line", ...arm }}
      profile={sketch.shape}
      stroke={accent}
      strokeWidth={shapes.stroke(stroke.default)}
      opacity={
        motion.ramp(frame, BufferCompassShared.SWEEP_AT, motion.panel) *
        (1 -
          motion.ramp(
            frame,
            BufferCompassShared.ARM_FADE_AT,
            motion.reveal.duration,
          ))
      }
    />
  );
}
