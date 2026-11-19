import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PeerContributionRecognition.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; focusedX: number };

/** Frames the arm takes to point at the object, and later to turn away. */
const ARM_FRAMES = 24;
/** Frames the acknowledgment anchor and the acknowledgment take to appear. */
const ACKNOWLEDGE_FRAMES = 20;
/** A spoken acknowledgment's corner before the corner style scales it. */
const SPOKEN_CORNER = 20;
/** A written acknowledgment's corner before the corner style scales it. */
const WRITTEN_CORNER = 2;
/** A pointing arm contacts the focused object before turning to its maker. */
export function RecognitionExchange({
  input,
  frame,
  accent,
  focusedX,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const arm = motion.scale(ARM_FRAMES);
  const acknowledge = motion.scale(ACKNOWLEDGE_FRAMES);
  const peer = tokens.color.accentAlt;
  const point = ramp(frame, 45, arm, motion.travel.easing);
  const turn = ramp(frame, 89, arm, motion.travel.easing);
  const handX = mix(turn, mix(point, 788, focusedX + 80), 195);
  const handY = mix(turn, mix(point, 315, 330), 300);
  return (
    <g>
      <g opacity={motion.reveal(frame, 12)}>
        <PersonGlyph x={150} y={300} size={76} color={accent} />
        <PersonGlyph x={810} y={300} size={76} color={peer} />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: `M810 300 L${handX} ${handY}` }}
        profile={tokens.sketch.shape}
        stroke={peer}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
        fill="none"
      />
      <circle
        data-pointing-hand="true"
        cx={handX}
        cy={handY}
        r={5}
        fill={peer}
      />
      <circle cx={mix(turn, 803, 799)} cy={277} r={2.5} fill={peer} />
      <g data-acknowledgment-anchor="true">
        <SketchedShape
          shape={{ kind: "line", x1: focusedX + 80, y1: 330, x2: 165, y2: 340 }}
          profile={tokens.sketch.shape}
          opacity={
            ramp(frame, 67, acknowledge, motion.reveal.easing) * atomic.opacity["60"]
          }
          stroke={accent}
          strokeDasharray={atomic.dash.spaced.join(" ")}
        />
      </g>
      <g opacity={ramp(frame, 89, acknowledge, motion.reveal.easing)}>
        <StockRect
          data-acknowledgment-box="true"
          x={310}
          y={30}
          width={590}
          height={90}
          rx={scales.corner(
            input.acknowledgment.form === "spoken"
              ? SPOKEN_CORNER
              : WRITTEN_CORNER,
          )}
          stroke={peer}
          fill={tokens.color.surface}
        />
        {input.acknowledgment.form === "spoken" ? (
          <SketchedShape
            shape={{ kind: "path", d: "M800 120 l10 18 l10 -18" }}
            profile={tokens.sketch.shape}
            fill={tokens.color.surface}
            stroke={peer}
          />
        ) : (
          <SketchedShape
            shape={{ kind: "path", d: "M870 30 v20 h30" }}
            profile={tokens.sketch.shape}
            stroke={peer}
            fill="none"
          />
        )}
        <LabelSlots
          labels={[[input.acknowledgment.text, 330, 55, 550, 18, 3]]}
        />
      </g>
    </g>
  );
}
