import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LiftedCase } from "./LiftedCase";
import type { Props } from "./TravelingCaseShared.types";
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
  const x = Motion.mix({
    t: progress,
    from: mapX,
    to: histogramX,
  });
  const y =
    Motion.mix({
      t: progress,
      from: mapY,
      to: histogramY - 6,
    }) -
    18 * Math.sin(progress * Math.PI);
  return (
    <LiftedCase
      position={position}
      accent={accent}
      showGuide={showGuide}
      tokens={tokens}
      record={record}
      index={index}
      x={x}
      y={y}
    />
  );
}
