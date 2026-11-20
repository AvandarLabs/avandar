import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Only accepting the request moves a chair and colleague to the shared task.
 */
export function SupportParticipants({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const join =
    input.response.state === "joins"
      ? motion.ramp(frame, 97, motion.scale(20), motion.travel.easing)
      : 0;
  const colleagueX = mix(join, 780, 670);
  const chairX = mix(join, 780, 650);
  const grab =
    input.response.state === "joins"
      ? motion.ramp(frame, 89, motion.whip, motion.travel.easing)
      : 0;
  const reach =
    input.response.state === "joins"
      ? motion.ramp(frame, 117, motion.sheet, motion.travel.easing)
      : 0;
  const handX = mix(reach, mix(grab, 760, chairX + 55), 570);
  const handY = mix(reach, mix(grab, 345, 375), 365);
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <PersonGlyph x={240} y={330} size={76} posture="seated" color={accent} />
      <SketchedShape
        shape={{ kind: "path", d: "M240 330 L330 365" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <PersonGlyph
        x={colleagueX}
        y={330}
        size={76}
        color={tokens.color.accentAlt}
      />
      <circle
        cx={colleagueX - mix(motion.ramp(frame, 43, motion.scale(20)), 0, 10)}
        cy={307}
        r={2.5}
        fill={tokens.color.accentAlt}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${colleagueX} 330 L${handX} ${handY}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <circle
        data-chair-hand={
          input.response.state === "joins" && frame >= 97 && frame <= 117
            ? "true"
            : undefined
        }
        data-shared-hand={
          input.response.state === "joins" && frame >= 117 ? "true" : undefined
        }
        cx={handX}
        cy={handY}
        r={5}
        fill={tokens.color.accentAlt}
      />
      {input.response.state === "joins" && frame > 89 ? (
        <StockRect
          data-second-chair="true"
          x={chairX}
          y={375}
          width={55}
          height={35}
          rx={scales.corner(tokens.corner.chip)}
          stroke={tokens.color.accentAlt}
          fill="none"
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          opacity={motion.ramp(frame, 89, motion.whip)}
        />
      ) : undefined}
      <g data-colleague-name="true">
        <LabelSlots labels={[[input.people.colleague, 700, 200, 200, 20, 4]]} />
      </g>
    </g>
  );
}
