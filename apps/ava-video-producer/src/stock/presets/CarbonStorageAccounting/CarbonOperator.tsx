import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { frame: number };
/** The operator reaches the capture valve before transfer begins. */
export function CarbonOperator({ frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const cue = motion.ramp(frame, 44, motion.scale(10), motion.travel.easing);
  return (
    <g>
      {" "}
      <PersonGlyph
        x={150}
        y={325}
        size={42}
        role="worker"
        color={tokens.color.highlight}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M150 325 L210 ${mix(cue, 330, 339)} L${mix(cue, 174, 280)} ${mix(cue, 337, 354)}`,
        }}
        profile={tokens.sketch.shape}
        data-operator-arm
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-operator-hand
        cx={mix(cue, 174, 280)}
        cy={mix(cue, 337, 354)}
        r={3}
        fill={tokens.color.highlight}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: 280, cy: 354, r: 7 }}
        profile={tokens.sketch.shape}
        data-transfer-valve
        fill={tokens.color.surface}
        stroke={tokens.color.highlight}
      />
    </g>
  );
}
