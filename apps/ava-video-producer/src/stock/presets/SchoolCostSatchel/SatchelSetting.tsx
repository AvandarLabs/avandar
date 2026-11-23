import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SatchelBag } from "./SatchelBag/SatchelBag";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };
/** Draws the scene's SatchelSetting group with fixed authored geometry. */
export function SatchelSetting({ frame, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const opening = motion.ramp(
    frame,
    24,
    motion.scale(14),
    motion.entrance.easing,
  );
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M65 305 V160 H195 V305 M70 165 L112 184 V305 M112 184 H190",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M45 310 H305" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
      />
      <PersonGlyph x={245} y={237} size={70} color={accent} />
      <SatchelBag opening={opening} accent={accent} />
    </>
  );
}
