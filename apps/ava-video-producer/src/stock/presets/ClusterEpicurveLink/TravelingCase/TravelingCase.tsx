import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { IdentityGuide } from "./IdentityGuide";
import { type Props } from "./TravelingCaseShared.types";
import type { ReactNode } from "react";
/**
 * A numbered copy rises along its identity guide without implying transmission.
 */
export function TravelingCase({
  position,
  frame,
  accent,
  showGuide,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { record, index, mapX, mapY, histogramX, histogramY } = position;
  const progress = motion.ramp(
    frame,
    36,
    motion.scale(48),
    motion.travel.easing,
  );
  const x = mix(progress, mapX, histogramX);
  const y =
    mix(progress, mapY, histogramY - 6) - 18 * Math.sin(progress * Math.PI);
  return (
    <g>
      {showGuide ? (
        <IdentityGuide position={position} accent={accent} />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: 9 }}
        profile={tokens.sketch.shape}
        data-lifted-case={record.id}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <text
        x={x}
        y={y + 4}
        fill={tokens.color.text}
        textAnchor="middle"
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {index + 1}
      </text>
    </g>
  );
}
